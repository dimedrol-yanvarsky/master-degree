// Пакет testing — use case прохождения тестов. Записывает результат и, когда у
// клиента появляется новая завершённая пара (тест на психотип BFI-2 + тест на
// текущее эмоциональное состояние BDS), добавляет в граф новую вершину и
// оповещает по почте именно тех специалистов, кто сотрудничает с этим клиентом.
package testing

import (
	"context"
	"errors"
	"fmt"
	"math"
	"sort"
	"strings"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/collaboration"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/emotion"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	domainsupport "github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/support"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/test"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
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
	Support        SupportEngine
	Notifier       port.SpecialistNotifier
	IDs            port.IDGenerator
	Clock          port.Clock
}

type SupportEngine interface {
	Infer(inputs map[string]float64) domainsupport.Result
}

// Service реализует приём результатов тестов и сопутствующую логику графа.
type Service struct {
	deps Deps
}

// NewService собирает use case тестирования.
func NewService(deps Deps) *Service {
	if deps.Support == nil {
		deps.Support = domainsupport.NewEngine()
	}
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

// CreateTestInput — данные ручного теста, создаваемого специалистом или администратором.
type CreateTestInput struct {
	AuthorID    string
	Title       string
	Code        string
	Description string
	Questions   []string
}

type UpdateTestInput struct {
	ActorID     string
	ID          string
	Title       string
	Code        string
	Description string
	Questions   []string
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
	if code == "" {
		return SubmitResult{}, fmt.Errorf("%w: test code is required", shared.ErrValidation)
	}
	if strings.TrimSpace(in.UserID) == "" {
		return SubmitResult{}, fmt.Errorf("%w: user is required", shared.ErrValidation)
	}
	if code != CodePsychotype && code != CodeEmotional {
		if s.deps.Tests == nil {
			return SubmitResult{}, fmt.Errorf("%w: unknown test code %q", shared.ErrValidation, in.TestCode)
		}
		if _, err := s.deps.Tests.FindByID(ctx, code); err != nil {
			if errors.Is(err, shared.ErrNotFound) {
				return SubmitResult{}, fmt.Errorf("%w: unknown test code %q", shared.ErrValidation, in.TestCode)
			}
			return SubmitResult{}, err
		}
	}

	normalizedScore := in.Score
	normalizedScoreLabel := strings.TrimSpace(in.ScoreLabel)
	normalizedLevel := strings.TrimSpace(in.Level)
	normalizedDomains := in.Domains
	if code == CodePsychotype {
		if domains, ok := bfi2DomainsFromAnswers(in.Answers); ok {
			normalizedDomains = domains
		}
	}
	if code == CodeEmotional {
		normalizedScore = bdsScore(in.Score, in.Answers)
		if normalizedScoreLabel == "" && normalizedScore > 0 {
			normalizedScoreLabel = fmt.Sprintf("%.0f из 64", normalizedScore)
		}
	}

	result := test.TestResult{
		ID:          s.deps.IDs.NewID(),
		UserID:      in.UserID,
		TestID:      code,
		TestCode:    code,
		Answers:     in.Answers,
		Score:       normalizedScore,
		ScoreLabel:  normalizedScoreLabel,
		Level:       normalizedLevel,
		Summary:     in.Summary,
		Domains:     normalizedDomains,
		CompletedAt: s.deps.Clock.Now(),
	}
	if err := s.deps.Results.Create(ctx, result); err != nil {
		return SubmitResult{}, err
	}

	out := SubmitResult{Result: result}
	if code != CodeEmotional {
		return out, nil
	}

	history, err := s.ListResults(ctx, in.UserID)
	if err != nil {
		return SubmitResult{}, err
	}

	latestBFI, ok := latestResultByCode(history, CodePsychotype)
	if !ok {
		return out, nil
	}

	point, err := s.supportPoint(latestBFI, result)
	if err != nil {
		return SubmitResult{}, err
	}
	point.Date = result.CompletedAt
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

	return out, nil
}

type testResultRepositoryByEmail interface {
	ListByUserEmail(ctx context.Context, email string) ([]test.TestResult, error)
}

type collaborationRepositoryByClientEmail interface {
	ListByClientEmail(ctx context.Context, email string) ([]collaboration.Collaboration, error)
}

func (s *Service) ListTests(ctx context.Context) ([]test.Test, error) {
	if s.deps.Tests == nil {
		return []test.Test{}, nil
	}
	return s.deps.Tests.List(ctx)
}

// CreateTest сохраняет новый ручной тест в системной базе тестов.
func (s *Service) CreateTest(ctx context.Context, in CreateTestInput) (test.Test, error) {
	if s.deps.Tests == nil {
		return test.Test{}, fmt.Errorf("%w: test repository is not configured", shared.ErrValidation)
	}

	questions := cleanQuestions(in.Questions)
	if strings.TrimSpace(in.Title) == "" {
		return test.Test{}, fmt.Errorf("%w: title is required", shared.ErrValidation)
	}
	if len(questions) == 0 {
		return test.Test{}, fmt.Errorf("%w: questions are required", shared.ErrValidation)
	}

	code := normalizeTestCode(in.Code)
	if code == "" {
		code = normalizeTestCode(in.Title)
	}

	now := s.deps.Clock.Now()
	item := test.Test{
		ID:             s.deps.IDs.NewID(),
		Code:           code,
		Title:          strings.TrimSpace(in.Title),
		Description:    firstNonEmpty(strings.TrimSpace(in.Description), "Пользовательский опросник, добавленный специалистом или администратором."),
		AuthorID:       strings.TrimSpace(in.AuthorID),
		QuestionCount:  len(questions),
		PassingMinutes: estimatedPassingMinutes(len(questions)),
		SourceNote:     "Тест добавлен вручную специалистом или администратором.",
		Questions:      toQuestions(questions),
		Scale:          defaultManualScale(),
		Status:         "active",
		CreatedAt:      now,
	}
	if err := s.deps.Tests.Create(ctx, item); err != nil {
		return test.Test{}, err
	}
	return item, nil
}

func (s *Service) UpdateTest(ctx context.Context, in UpdateTestInput) (test.Test, error) {
	if s.deps.Tests == nil {
		return test.Test{}, fmt.Errorf("%w: test repository is not configured", shared.ErrValidation)
	}
	id := strings.TrimSpace(in.ID)
	if id == "" {
		return test.Test{}, fmt.Errorf("%w: test id is required", shared.ErrValidation)
	}

	current, err := s.deps.Tests.FindByID(ctx, id)
	if err != nil {
		return test.Test{}, err
	}
	if err := s.ensureCanManageTest(ctx, in.ActorID, current); err != nil {
		return test.Test{}, err
	}

	questions := cleanQuestions(in.Questions)
	if strings.TrimSpace(in.Title) == "" {
		return test.Test{}, fmt.Errorf("%w: title is required", shared.ErrValidation)
	}
	if len(questions) == 0 {
		return test.Test{}, fmt.Errorf("%w: questions are required", shared.ErrValidation)
	}

	code := normalizeTestCode(in.Code)
	if code == "" {
		code = normalizeTestCode(in.Title)
	}

	current.Code = code
	current.Title = strings.TrimSpace(in.Title)
	current.Description = firstNonEmpty(strings.TrimSpace(in.Description), current.Description)
	current.QuestionCount = len(questions)
	current.PassingMinutes = estimatedPassingMinutes(len(questions))
	current.Questions = toQuestions(questions)
	if len(current.Scale) == 0 {
		current.Scale = defaultManualScale()
	}
	if strings.TrimSpace(current.Status) == "" {
		current.Status = "active"
	}
	if err := s.deps.Tests.Update(ctx, current); err != nil {
		return test.Test{}, err
	}
	return current, nil
}

func (s *Service) DeleteTest(ctx context.Context, actorID, id string) error {
	if s.deps.Tests == nil {
		return fmt.Errorf("%w: test repository is not configured", shared.ErrValidation)
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return fmt.Errorf("%w: test id is required", shared.ErrValidation)
	}

	current, err := s.deps.Tests.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if err := s.ensureCanManageTest(ctx, actorID, current); err != nil {
		return err
	}
	return s.deps.Tests.Delete(ctx, current.ID)
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

func (s *Service) ListClientResults(ctx context.Context, specialistID, clientID string) ([]test.TestResult, error) {
	if err := s.ensureSpecialistClientAccess(ctx, specialistID, clientID); err != nil {
		return nil, err
	}
	return s.ListResults(ctx, clientID)
}

func cleanQuestions(raw []string) []string {
	questions := make([]string, 0, len(raw))
	for _, item := range raw {
		question := strings.TrimSpace(item)
		if question != "" {
			questions = append(questions, question)
		}
	}
	return questions
}

func normalizeTestCode(value string) string {
	code := strings.ToLower(strings.TrimSpace(value))
	code = strings.ReplaceAll(code, "_", "-")
	code = strings.Join(strings.Fields(code), "-")
	var builder strings.Builder
	for _, r := range code {
		if r >= 'a' && r <= 'z' || r >= '0' && r <= '9' || r >= 'а' && r <= 'я' || r == 'ё' || r == '-' {
			builder.WriteRune(r)
		}
	}
	code = strings.Trim(builder.String(), "-")
	if code == "" {
		return ""
	}
	return "custom-" + strings.TrimPrefix(code, "custom-")
}

func estimatedPassingMinutes(questionCount int) int {
	minutes := questionCount / 5
	if questionCount%5 != 0 {
		minutes++
	}
	if minutes < 1 {
		return 1
	}
	return minutes
}

func toQuestions(items []string) []test.Question {
	questions := make([]test.Question, 0, len(items))
	for index, text := range items {
		questions = append(questions, test.Question{Index: index, Text: text})
	}
	return questions
}

func defaultManualScale() []test.AnswerOption {
	return []test.AnswerOption{
		{Value: 1, Label: "совсем нет"},
		{Value: 2, Label: "скорее нет"},
		{Value: 3, Label: "затрудняюсь"},
		{Value: 4, Label: "скорее да"},
		{Value: 5, Label: "полностью да"},
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
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

var bfi2DomainDefinitions = []struct {
	label    string
	variable string
	items    []int
}{
	{label: "Экстраверсия", variable: domainsupport.VarExtraversion, items: []int{1, 6, -11, -16, 21, -26, -31, -36, 41, 46, -51, 56}},
	{label: "Доброжелательность", variable: domainsupport.VarAgreeableness, items: []int{2, 7, -12, -17, -22, 27, 32, -37, -42, -47, 52, 57}},
	{label: "Добросовестность", variable: domainsupport.VarConscientiousness, items: []int{-3, -8, 13, 18, -23, -28, 33, 38, 43, -48, 53, -58}},
	{label: "Нейротизм", variable: domainsupport.VarNeuroticism, items: []int{-4, -9, 14, 19, -24, -29, 34, 39, -44, -49, 54, 59}},
	{label: "Открытость к опыту", variable: domainsupport.VarOpenness, items: []int{-5, 10, 15, 20, -25, -30, 35, 40, -45, -50, -55, 60}},
}

func (s *Service) supportPoint(bfiResult, bdsResult test.TestResult) (emotion.Point, error) {
	inputs, err := supportInputs(bfiResult, bdsResult)
	if err != nil {
		return emotion.Point{}, err
	}

	result := s.deps.Support.Infer(inputs)
	if len(result.Activations) == 0 {
		return emotion.Point{}, fmt.Errorf("%w: fuzzy rule base did not activate", shared.ErrValidation)
	}

	return emotion.Point{
		SupportNeed:               result.Score,
		SupportNeedLevel:          supportTermLevel(result.Term),
		SecondarySupportNeedLevel: supportTermLevel(secondarySupportTerm(result)),
		Score:                     result.Score,
		SecondaryScore:            domainsupport.RoundScore(100 - result.Score),
		Truth:                     roundTruth(result.Memberships[result.Term]),
		Level:                     domainsupport.Label(result.Term),
	}, nil
}

func supportTermLevel(term string) int {
	orderedTerms := domainsupport.OutputTermOrder()
	for index, candidate := range orderedTerms {
		if candidate == term {
			return len(orderedTerms) - index
		}
	}
	return 0
}

func secondarySupportTerm(result domainsupport.Result) string {
	orderedTerms := domainsupport.OutputTermOrder()
	bestTerm := ""
	bestValue := -1.0
	for _, term := range orderedTerms {
		if term == result.Term {
			continue
		}
		if value := result.Memberships[term]; value > bestValue {
			bestTerm = term
			bestValue = value
		}
	}
	if bestValue > 0 {
		return bestTerm
	}

	for index, term := range orderedTerms {
		if term != result.Term {
			continue
		}
		if index > 0 {
			return orderedTerms[index-1]
		}
		if index+1 < len(orderedTerms) {
			return orderedTerms[index+1]
		}
	}
	return bestTerm
}

func roundTruth(value float64) float64 {
	return math.Round(value*100) / 100
}

func supportInputs(bfiResult, bdsResult test.TestResult) (map[string]float64, error) {
	domainInputs, err := bfiDomainInputs(bfiResult)
	if err != nil {
		return nil, err
	}

	emotionalState := bdsScore(bdsResult.Score, bdsResult.Answers)
	if !inRange(emotionalState, 16, 64) {
		return nil, fmt.Errorf("%w: bds score must be in [16, 64]", shared.ErrValidation)
	}
	domainInputs[domainsupport.VarEmotionalState] = emotionalState

	return domainInputs, nil
}

func bfiDomainInputs(result test.TestResult) (map[string]float64, error) {
	values := make(map[string]float64, len(bfi2DomainDefinitions))
	for _, domain := range result.Domains {
		variable := bfiDomainVariable(domain.Label)
		if variable == "" {
			continue
		}
		values[variable] = domain.Score
	}

	if len(values) < len(bfi2DomainDefinitions) {
		if domains, ok := bfi2DomainsFromAnswers(result.Answers); ok {
			for _, domain := range domains {
				if variable := bfiDomainVariable(domain.Label); variable != "" {
					values[variable] = domain.Score
				}
			}
		}
	}

	for _, definition := range bfi2DomainDefinitions {
		value, ok := values[definition.variable]
		if !ok {
			return nil, fmt.Errorf("%w: latest bfi-2 result does not contain %s", shared.ErrValidation, definition.label)
		}
		if !inRange(value, 1, 5) {
			return nil, fmt.Errorf("%w: %s must be in [1, 5]", shared.ErrValidation, definition.label)
		}
	}

	return values, nil
}

func bfi2DomainsFromAnswers(answers []test.Answer) ([]test.DomainScore, bool) {
	answerByIndex := make(map[int]int, len(answers))
	for _, answer := range answers {
		if answer.Value >= 1 && answer.Value <= 5 {
			answerByIndex[answer.QuestionIndex] = answer.Value
		}
	}

	domains := make([]test.DomainScore, 0, len(bfi2DomainDefinitions))
	for _, definition := range bfi2DomainDefinitions {
		sum := 0.0
		for _, item := range definition.items {
			index := item
			reverse := false
			if index < 0 {
				index = -index
				reverse = true
			}

			value, ok := answerByIndex[index-1]
			if !ok {
				return nil, false
			}
			if reverse {
				value = 6 - value
			}
			sum += float64(value)
		}
		score := math.Round((sum/float64(len(definition.items)))*100) / 100
		domains = append(domains, test.DomainScore{Label: definition.label, Score: score})
	}

	return domains, true
}

func bdsScore(score float64, answers []test.Answer) float64 {
	if total, ok := bdsTotalFromAnswers(answers); ok {
		return total
	}
	if inRange(score, 16, 64) {
		return score
	}
	if inRange(score, 1, 4) {
		return math.Round(score * 16)
	}
	return score
}

func bdsTotalFromAnswers(answers []test.Answer) (float64, bool) {
	if len(answers) < 16 {
		return 0, false
	}

	seen := make(map[int]struct{}, len(answers))
	total := 0
	for _, answer := range answers {
		if answer.QuestionIndex < 0 || answer.Value < 1 || answer.Value > 4 {
			return 0, false
		}
		if _, exists := seen[answer.QuestionIndex]; exists {
			continue
		}
		seen[answer.QuestionIndex] = struct{}{}
		total += answer.Value
	}
	if len(seen) != 16 {
		return 0, false
	}
	return float64(total), true
}

func bfiDomainVariable(label string) string {
	normalized := strings.ToLower(strings.TrimSpace(label))
	normalized = strings.ReplaceAll(normalized, "ё", "е")
	legacyNeuroticismMarker := "\u043d\u0435\u0433\u0430\u0442\u0438\u0432"

	switch {
	case normalized == domainsupport.VarExtraversion || strings.Contains(normalized, "экстрав") || strings.Contains(normalized, "extrav"):
		return domainsupport.VarExtraversion
	case normalized == domainsupport.VarConscientiousness || strings.Contains(normalized, "доброс") || strings.Contains(normalized, "conscient"):
		return domainsupport.VarConscientiousness
	case normalized == domainsupport.VarAgreeableness || strings.Contains(normalized, "доброж") || strings.Contains(normalized, "agree"):
		return domainsupport.VarAgreeableness
	case normalized == domainsupport.VarNeuroticism || strings.Contains(normalized, "нейрот") || strings.Contains(normalized, legacyNeuroticismMarker) || strings.Contains(normalized, "neuro") || strings.Contains(normalized, "negative"):
		return domainsupport.VarNeuroticism
	case normalized == domainsupport.VarOpenness || strings.Contains(normalized, "открыт") || strings.Contains(normalized, "open"):
		return domainsupport.VarOpenness
	default:
		return ""
	}
}

func latestResultByCode(results []test.TestResult, code string) (test.TestResult, bool) {
	code = strings.ToLower(strings.TrimSpace(code))
	var latest test.TestResult
	found := false
	for _, result := range results {
		if resultCode(result) != code {
			continue
		}
		if !found || result.CompletedAt.After(latest.CompletedAt) {
			latest = result
			found = true
		}
	}
	return latest, found
}

func resultCode(result test.TestResult) string {
	return strings.ToLower(strings.TrimSpace(firstNonEmpty(result.TestCode, result.TestID)))
}

func inRange(value, min, max float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0) && value >= min && value <= max
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

func (s *Service) ClientGraph(ctx context.Context, specialistID, clientID string) (emotion.Graph, error) {
	if err := s.ensureSpecialistClientAccess(ctx, specialistID, clientID); err != nil {
		return emotion.Graph{}, err
	}
	return s.Graph(ctx, clientID)
}

func (s *Service) ensureCanManageTest(ctx context.Context, actorID string, item test.Test) error {
	if s.deps.Users == nil {
		return shared.ErrForbidden
	}
	actor, err := s.deps.Users.FindByID(ctx, strings.TrimSpace(actorID))
	if err != nil {
		return err
	}
	if actor.Role == shared.RoleAdmin {
		return nil
	}
	if actor.Role == shared.RoleSpecialist && strings.TrimSpace(item.AuthorID) != "" && item.AuthorID == actor.ID {
		return nil
	}
	return shared.ErrForbidden
}

func (s *Service) ensureSpecialistClientAccess(ctx context.Context, specialistID, clientID string) error {
	specialistID = strings.TrimSpace(specialistID)
	clientID = strings.TrimSpace(clientID)
	if specialistID == "" || clientID == "" {
		return fmt.Errorf("%w: specialist and client are required", shared.ErrValidation)
	}
	if s.deps.Users == nil || s.deps.Collaborations == nil {
		return shared.ErrForbidden
	}

	specialist, err := s.deps.Users.FindByID(ctx, specialistID)
	if err != nil {
		return err
	}
	if specialist.Role != shared.RoleSpecialist {
		return shared.ErrForbidden
	}
	client, err := s.deps.Users.FindByID(ctx, clientID)
	if err != nil {
		return err
	}
	if client.Role != shared.RoleClient {
		return shared.ErrForbidden
	}

	collaboration, err := s.deps.Collaborations.FindBetween(ctx, specialist.ID, client.ID)
	if err != nil {
		return err
	}
	if !collaboration.GrantsAccess() {
		return shared.ErrForbidden
	}
	return nil
}

// notifySpecialists рассылает оповещение только специалистам с принятым
// сотрудничеством с этим клиентом.
func (s *Service) notifySpecialists(ctx context.Context, clientID string, point emotion.Point) ([]string, error) {
	if s.deps.Notifier == nil {
		return nil, nil
	}

	client, err := s.deps.Users.FindByID(ctx, clientID)
	if err != nil {
		return nil, err
	}

	collaborations, err := s.deps.Collaborations.ListByClient(ctx, clientID)
	if err != nil {
		if errors.Is(err, shared.ErrNotFound) {
			collaborations = nil
		} else {
			return nil, err
		}
	}

	if byEmail, ok := s.deps.Collaborations.(collaborationRepositoryByClientEmail); ok && strings.TrimSpace(client.Email) != "" {
		emailCollaborations, err := byEmail.ListByClientEmail(ctx, client.Email)
		if err != nil && !errors.Is(err, shared.ErrNotFound) {
			return nil, err
		}
		if err == nil {
			collaborations = mergeCollaborations(collaborations, emailCollaborations)
		}
	}

	var recipients []string
	seenRecipients := make(map[string]struct{})
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
		email := strings.TrimSpace(specialist.Email)
		if email == "" {
			continue
		}
		emailKey := strings.ToLower(email)
		if _, exists := seenRecipients[emailKey]; exists {
			continue
		}
		seenRecipients[emailKey] = struct{}{}
		recipients = append(recipients, email)
	}
	if len(recipients) == 0 {
		return nil, nil
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

func mergeCollaborations(left, right []collaboration.Collaboration) []collaboration.Collaboration {
	out := make([]collaboration.Collaboration, 0, len(left)+len(right))
	seen := make(map[string]struct{}, len(left)+len(right))

	for _, item := range append(left, right...) {
		key := item.ID
		if strings.TrimSpace(key) == "" {
			key = item.SpecialistID + "|" + item.ClientID + "|" + string(item.Status)
		}
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, item)
	}
	return out
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
