// Пакет testing — use case прохождения тестов. Записывает результат и, когда у
// клиента появляется новая завершённая пара (тест на психотип BFI-2 + тест на
// текущее эмоциональное состояние BDS), добавляет в граф новую вершину и
// оповещает по почте именно тех специалистов, кто сотрудничает с этим клиентом.
package testing

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/application/port"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/emotion"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/test"
)

// Коды тестов, формирующих вершину графа.
const (
	CodePsychotype = "bfi-2" // психотип
	CodeEmotional  = "bds"   // текущее эмоциональное состояние
)

// Deps группирует порты, от которых зависит use case.
type Deps struct {
	Tests          port.TestRepository
	Results        port.TestResultRepository
	Graphs         port.EmotionGraphRepository
	Collaborations port.CollaborationRepository
	Users          port.UserRepository
	Notifier       port.SpecialistNotifier
	IDs            port.IDGenerator
	Clock          port.Clock
}

// Service реализует приём результатов тестов и сопутствующую логику графа.
type Service struct {
	deps Deps
}

// NewService собирает use case тестирования.
func NewService(deps Deps) *Service {
	return &Service{deps: deps}
}

// SubmitInput — данные о завершённом прохождении одного теста.
type SubmitInput struct {
	UserID     string
	TestCode   string
	Answers    []test.Answer
	Score      float64
	ScoreLabel string
	Level      string
	Summary    string
	Domains    []test.DomainScore
}

// SubmitResult — итог приёма результата: добавлена ли вершина и кого оповестили.
type SubmitResult struct {
	Result         test.TestResult
	VertexAdded    bool
	Point          emotion.Point
	NotifiedEmails []string
}

// Submit сохраняет результат теста и при необходимости добавляет вершину графа.
func (s *Service) Submit(ctx context.Context, in SubmitInput) (SubmitResult, error) {
	code := strings.ToLower(strings.TrimSpace(in.TestCode))
	if code != CodePsychotype && code != CodeEmotional {
		return SubmitResult{}, fmt.Errorf("%w: unknown test code %q", shared.ErrValidation, in.TestCode)
	}
	if strings.TrimSpace(in.UserID) == "" {
		return SubmitResult{}, fmt.Errorf("%w: user is required", shared.ErrValidation)
	}

	result := test.TestResult{
		ID:          s.deps.IDs.NewID(),
		UserID:      in.UserID,
		TestID:      code,
		TestCode:    code,
		Answers:     in.Answers,
		Score:       in.Score,
		ScoreLabel:  in.ScoreLabel,
		Level:       in.Level,
		Summary:     in.Summary,
		Domains:     in.Domains,
		CompletedAt: s.deps.Clock.Now(),
	}
	if err := s.deps.Results.Create(ctx, result); err != nil {
		return SubmitResult{}, err
	}

	out := SubmitResult{Result: result}

	history, err := s.ListResults(ctx, in.UserID)
	if err != nil {
		return SubmitResult{}, err
	}

	psychoCount, emoCount := 0, 0
	var latestEmotional test.TestResult
	hasEmotional := false
	for _, r := range history {
		switch r.TestID {
		case CodePsychotype:
			psychoCount++
		case CodeEmotional:
			emoCount++
			if !hasEmotional || r.CompletedAt.After(latestEmotional.CompletedAt) {
				latestEmotional = r
				hasEmotional = true
			}
		}
	}

	// Завершённых пар столько, сколько меньшего из тестов. Каждая новая пара —
	// одна вершина.
	pairs := psychoCount
	if emoCount < pairs {
		pairs = emoCount
	}

	graph, err := s.deps.Graphs.FindByUser(ctx, in.UserID)
	if err != nil && !errors.Is(err, shared.ErrNotFound) {
		return SubmitResult{}, err
	}
	existingVertices := len(graph.Points)

	if pairs > existingVertices && hasEmotional {
		// Значение вершины берём из последнего теста эмоционального состояния
		// (динамическая часть потребности в поддержке); психотип обязателен как
		// условие появления вершины.
		point := emotion.Point{
			Date:        s.deps.Clock.Now(),
			SupportNeed: latestEmotional.Score,
			Level:       latestEmotional.Level,
		}
		if err := s.deps.Graphs.AppendPoint(ctx, in.UserID, point); err != nil {
			return SubmitResult{}, err
		}
		out.VertexAdded = true
		out.Point = point

		emails, err := s.notifySpecialists(ctx, in.UserID, point)
		if err != nil {
			return SubmitResult{}, err
		}
		out.NotifiedEmails = emails
	}

	return out, nil
}

type testResultRepositoryByEmail interface {
	ListByUserEmail(ctx context.Context, email string) ([]test.TestResult, error)
}

func (s *Service) ListTests(ctx context.Context) ([]test.Test, error) {
	if s.deps.Tests == nil {
		return []test.Test{}, nil
	}
	return s.deps.Tests.List(ctx)
}

func (s *Service) ListResults(ctx context.Context, userID string) ([]test.TestResult, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("%w: user is required", shared.ErrValidation)
	}
	if s.deps.Results == nil {
		return []test.TestResult{}, nil
	}

	results, err := s.deps.Results.ListByUser(ctx, userID)
	if err != nil && !errors.Is(err, shared.ErrNotFound) {
		return nil, err
	}
	if err != nil {
		results = nil
	}

	if byEmail, ok := s.deps.Results.(testResultRepositoryByEmail); ok && s.deps.Users != nil {
		currentUser, err := s.deps.Users.FindByID(ctx, userID)
		if err != nil && !errors.Is(err, shared.ErrNotFound) {
			return nil, err
		}
		if strings.TrimSpace(currentUser.Email) != "" {
			emailResults, err := byEmail.ListByUserEmail(ctx, currentUser.Email)
			if err != nil && !errors.Is(err, shared.ErrNotFound) {
				return nil, err
			}
			if err == nil {
				results = mergeResults(results, emailResults)
			}
		}
	}

	sort.SliceStable(results, func(i, j int) bool {
		return results[i].CompletedAt.After(results[j].CompletedAt)
	})
	return results, nil
}

func mergeResults(left, right []test.TestResult) []test.TestResult {
	out := make([]test.TestResult, 0, len(left)+len(right))
	seen := make(map[string]struct{}, len(left)+len(right))

	for _, result := range append(left, right...) {
		key := result.ID
		if strings.TrimSpace(key) == "" {
			key = result.TestID + "|" + result.TestCode + "|" + result.CompletedAt.Format("2006-01-02T15:04:05.999999999Z07:00")
		}
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, result)
	}
	return out
}

// Graph возвращает граф эмоционального состояния пользователя (пустой, если его
// ещё нет).
func (s *Service) Graph(ctx context.Context, userID string) (emotion.Graph, error) {
	graph, err := s.deps.Graphs.FindByUser(ctx, userID)
	if errors.Is(err, shared.ErrNotFound) {
		return emotion.Graph{UserID: userID}, nil
	}
	if err != nil {
		return emotion.Graph{}, err
	}
	return graph, nil
}

// notifySpecialists рассылает оповещение только специалистам с принятым
// сотрудничеством с этим клиентом.
func (s *Service) notifySpecialists(ctx context.Context, clientID string, point emotion.Point) ([]string, error) {
	if s.deps.Notifier == nil {
		return nil, nil
	}

	collaborations, err := s.deps.Collaborations.ListByClient(ctx, clientID)
	if err != nil {
		if errors.Is(err, shared.ErrNotFound) {
			return nil, nil
		}
		return nil, err
	}

	var recipients []string
	for _, c := range collaborations {
		if !c.GrantsAccess() { // только принятые связи открывают доступ к данным клиента
			continue
		}
		specialist, err := s.deps.Users.FindByID(ctx, c.SpecialistID)
		if errors.Is(err, shared.ErrNotFound) {
			continue
		}
		if err != nil {
			return nil, err
		}
		if strings.TrimSpace(specialist.Email) != "" {
			recipients = append(recipients, specialist.Email)
		}
	}
	if len(recipients) == 0 {
		return nil, nil
	}

	client, err := s.deps.Users.FindByID(ctx, clientID)
	if err != nil {
		return nil, err
	}

	notification := port.SpecialistNotification{
		ClientName:  fullName(client.Surname, client.Name, client.Patronymic),
		ClientEmail: client.Email,
		Recipients:  recipients,
		Score:       point.SupportNeed,
		Level:       point.Level,
		Date:        point.Date,
	}
	if err := s.deps.Notifier.NotifyNewGraphPoint(ctx, notification); err != nil {
		return nil, err
	}
	return recipients, nil
}

func fullName(parts ...string) string {
	cleaned := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			cleaned = append(cleaned, trimmed)
		}
	}
	return strings.Join(cleaned, " ")
}
