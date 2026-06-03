package testing_test

import (
	"context"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/adapters/persistence/memory"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/collaboration"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/emotion"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	domaintest "github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/test"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/user"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
	apptesting "github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/testing"
)

// --- вспомогательные фейки -------------------------------------------------

type captureNotifier struct {
	calls          int
	lastRecipients []string
	last           port.SpecialistNotification
}

func (n *captureNotifier) NotifyNewGraphPoint(_ context.Context, notification port.SpecialistNotification) error {
	n.calls++
	n.lastRecipients = notification.Recipients
	n.last = notification
	return nil
}

type seqIDs struct{ n int }

func (s *seqIDs) NewID() string { s.n++; return "id" + strconv.Itoa(s.n) }

type stepClock struct {
	base  time.Time
	step  time.Duration
	calls int
}

func (c *stepClock) Now() time.Time {
	now := c.base.Add(time.Duration(c.calls) * c.step)
	c.calls++
	return now
}

// --- сцена ------------------------------------------------------------------

type scene struct {
	service  *apptesting.Service
	notifier *captureNotifier
	graphs   *memory.EmotionGraphRepository
	clientID string
}

func newScene(t *testing.T) scene {
	t.Helper()
	ctx := context.Background()

	users := memory.NewUserRepository()
	mustCreateUser(t, users, user.User{ID: "client", Email: "client@example.com", Name: "Иван", Surname: "Клиентов", Role: shared.RoleClient, Status: shared.AccountActive})
	mustCreateUser(t, users, user.User{ID: "spec-accepted", Email: "accepted@spec.com", Name: "Марина", Role: shared.RoleSpecialist, Status: shared.AccountActive})
	mustCreateUser(t, users, user.User{ID: "spec-pending", Email: "pending@spec.com", Name: "Алексей", Role: shared.RoleSpecialist, Status: shared.AccountActive})
	mustCreateUser(t, users, user.User{ID: "spec-other", Email: "other@spec.com", Name: "Ольга", Role: shared.RoleSpecialist, Status: shared.AccountActive})
	mustCreateUser(t, users, user.User{ID: "other-client", Email: "other-client@example.com", Name: "Пётр", Role: shared.RoleClient, Status: shared.AccountActive})

	collaborations := memory.NewCollaborationRepository()
	mustCreateCollaboration(t, collaborations, collaboration.Collaboration{ID: "c1", SpecialistID: "spec-accepted", ClientID: "client", Status: collaboration.StatusAccepted})
	mustCreateCollaboration(t, collaborations, collaboration.Collaboration{ID: "c2", SpecialistID: "spec-pending", ClientID: "client", Status: collaboration.StatusPending})
	mustCreateCollaboration(t, collaborations, collaboration.Collaboration{ID: "c3", SpecialistID: "spec-other", ClientID: "other-client", Status: collaboration.StatusAccepted})

	notifier := &captureNotifier{}
	graphs := memory.NewEmotionGraphRepository()

	service := apptesting.NewService(apptesting.Deps{
		Results:        memory.NewTestResultRepository(),
		Graphs:         graphs,
		Collaborations: collaborations,
		Users:          users,
		Notifier:       notifier,
		IDs:            &seqIDs{},
		Clock:          &stepClock{base: time.Date(2026, 5, 30, 12, 0, 0, 0, time.UTC), step: time.Minute},
	})

	_ = ctx
	return scene{service: service, notifier: notifier, graphs: graphs, clientID: "client"}
}

func mustCreateUser(t *testing.T, repo *memory.UserRepository, u user.User) {
	t.Helper()
	if err := repo.Create(context.Background(), u); err != nil {
		t.Fatalf("seed user %s: %v", u.ID, err)
	}
}

func mustCreateCollaboration(t *testing.T, repo *memory.CollaborationRepository, c collaboration.Collaboration) {
	t.Helper()
	if err := repo.Create(context.Background(), c); err != nil {
		t.Fatalf("seed collaboration %s: %v", c.ID, err)
	}
}

type emailAwareCollaborationRepository struct {
	*memory.CollaborationRepository
	clientIDsByEmail map[string][]string
}

func (r *emailAwareCollaborationRepository) ListByClientEmail(ctx context.Context, email string) ([]collaboration.Collaboration, error) {
	clientIDs := r.clientIDsByEmail[strings.ToLower(strings.TrimSpace(email))]
	if len(clientIDs) == 0 {
		return nil, shared.ErrNotFound
	}

	items := make([]collaboration.Collaboration, 0)
	for _, clientID := range clientIDs {
		clientItems, err := r.ListByClient(ctx, clientID)
		if err != nil {
			return nil, err
		}
		items = append(items, clientItems...)
	}
	return items, nil
}

func (s scene) submit(t *testing.T, code string, score float64, level string) apptesting.SubmitResult {
	t.Helper()
	input := apptesting.SubmitInput{
		UserID:   s.clientID,
		TestCode: code,
		Score:    score,
		Level:    level,
	}
	if code == apptesting.CodePsychotype {
		input.Domains = referenceBFIDomains()
	}
	if code == apptesting.CodeEmotional {
		input.Answers = bdsAnswersForTotal(int(score))
	}

	result, err := s.service.Submit(context.Background(), input)
	if err != nil {
		t.Fatalf("submit %s: %v", code, err)
	}
	return result
}

func referenceBFIDomains() []domaintest.DomainScore {
	return []domaintest.DomainScore{
		{Label: "Экстраверсия", Score: 3.45},
		{Label: "Доброжелательность", Score: 3.22},
		{Label: "Добросовестность", Score: 3.52},
		{Label: "Нейротизм", Score: 3.09},
		{Label: "Открытость к опыту", Score: 3.83},
	}
}

func bdsAnswersForTotal(total int) []domaintest.Answer {
	if total < 16 {
		total = 16
	}
	if total > 64 {
		total = 64
	}
	answers := make([]domaintest.Answer, 16)
	remaining := total - 16
	for index := range answers {
		value := 1
		if remaining > 0 {
			add := remaining
			if add > 3 {
				add = 3
			}
			value += add
			remaining -= add
		}
		answers[index] = domaintest.Answer{QuestionIndex: index, Value: value}
	}
	return answers
}

// --- тесты ------------------------------------------------------------------

func TestNewVertexAppearsOnlyWhenBothTestsCompleted(t *testing.T) {
	s := newScene(t)

	// Один лишь психотип не создаёт вершину и не шлёт письма.
	if res := s.submit(t, apptesting.CodePsychotype, 3.6, "Сбалансированный профиль"); res.VertexAdded {
		t.Fatal("BFI-2 alone must not add a vertex")
	}
	if s.notifier.calls != 0 {
		t.Fatalf("no notification expected after one test, got %d", s.notifier.calls)
	}

	// Второй тест пары (эмоциональное состояние) создаёт вершину и шлёт письмо.
	res := s.submit(t, apptesting.CodeEmotional, 44, "Умеренный дистресс")
	if !res.VertexAdded {
		t.Fatal("BDS after BFI-2 must add a vertex")
	}
	if res.Point.SupportNeed <= 50 || res.Point.SupportNeed >= 75 {
		t.Fatalf("support need = %.2f, want fuzzy score around the reference high-support range", res.Point.SupportNeed)
	}
	if got := pointsCount(t, s); got != 1 {
		t.Fatalf("graph points = %d, want 1", got)
	}
	if s.notifier.calls != 1 {
		t.Fatalf("notifications = %d, want 1", s.notifier.calls)
	}
}

func TestBDSSubmitStoresCalculatedGraphPoint(t *testing.T) {
	s := newScene(t)
	s.submit(t, apptesting.CodePsychotype, 3.6, "")
	res := s.submit(t, apptesting.CodeEmotional, 44, "Умеренный дистресс")

	graph, err := s.graphs.FindByUser(context.Background(), s.clientID)
	if err != nil {
		t.Fatalf("find graph: %v", err)
	}
	if len(graph.Points) != 1 {
		t.Fatalf("graph points = %d, want 1", len(graph.Points))
	}
	point := graph.Points[0]
	if !point.Date.Equal(res.Result.CompletedAt) {
		t.Fatalf("point date = %s, want BDS completed_at %s", point.Date, res.Result.CompletedAt)
	}
	if point.SupportNeed <= 0 || point.Score != point.SupportNeed {
		t.Fatalf("support score not stored consistently: supportNeed=%.2f score=%.2f", point.SupportNeed, point.Score)
	}
	if point.SupportNeedLevel == 0 {
		t.Fatal("support need level was not stored")
	}
	if point.SecondarySupportNeedLevel == 0 {
		t.Fatal("secondary support need level was not stored")
	}
	if point.SecondaryScore <= 0 {
		t.Fatalf("secondary score = %.2f, want positive", point.SecondaryScore)
	}
	if point.Truth <= 0 || point.Truth > 1 {
		t.Fatalf("truth = %.2f, want in (0, 1]", point.Truth)
	}
}

func TestNotifiesOnlyAcceptedCollaboratingSpecialists(t *testing.T) {
	s := newScene(t)
	s.submit(t, apptesting.CodePsychotype, 3.6, "")
	s.submit(t, apptesting.CodeEmotional, 44, "Умеренный дистресс")

	if len(s.notifier.lastRecipients) != 1 || s.notifier.lastRecipients[0] != "accepted@spec.com" {
		t.Fatalf("recipients = %v, want [accepted@spec.com]", s.notifier.lastRecipients)
	}
}

func TestNotificationContainsCalculatedGraphPoint(t *testing.T) {
	s := newScene(t)
	s.submit(t, apptesting.CodePsychotype, 3.6, "")
	s.submit(t, apptesting.CodeEmotional, 44, "Умеренный дистресс")

	notification := s.notifier.last
	if notification.Score <= 0 || notification.Level == "" {
		t.Fatalf("support point is not included: score=%.2f level=%q", notification.Score, notification.Level)
	}
	if notification.Date.IsZero() {
		t.Fatal("support point date is not included")
	}
}

func TestBDSNotificationUsesClientEmailCollaborations(t *testing.T) {
	ctx := context.Background()
	users := memory.NewUserRepository()
	mustCreateUser(t, users, user.User{ID: "client-current", Email: "golubev@example.com", Name: "Дмитрий", Surname: "Голубев", Role: shared.RoleClient, Status: shared.AccountActive})
	mustCreateUser(t, users, user.User{ID: "spec-belova", Email: "belova@example.com", Name: "Елена", Surname: "Белова", Role: shared.RoleSpecialist, Status: shared.AccountActive})

	collaborations := &emailAwareCollaborationRepository{
		CollaborationRepository: memory.NewCollaborationRepository(),
		clientIDsByEmail: map[string][]string{
			"golubev@example.com": {"client-linked"},
		},
	}
	if err := collaborations.Create(ctx, collaboration.Collaboration{
		ID:           "linked-collaboration",
		SpecialistID: "spec-belova",
		ClientID:     "client-linked",
		Status:       collaboration.StatusAccepted,
	}); err != nil {
		t.Fatalf("seed collaboration: %v", err)
	}

	notifier := &captureNotifier{}
	service := apptesting.NewService(apptesting.Deps{
		Results:        memory.NewTestResultRepository(),
		Graphs:         memory.NewEmotionGraphRepository(),
		Collaborations: collaborations,
		Users:          users,
		Notifier:       notifier,
		IDs:            &seqIDs{},
		Clock:          &stepClock{base: time.Date(2026, 6, 3, 12, 0, 0, 0, time.UTC), step: time.Minute},
	})

	if _, err := service.Submit(ctx, apptesting.SubmitInput{
		UserID:   "client-current",
		TestCode: apptesting.CodePsychotype,
		Domains:  referenceBFIDomains(),
	}); err != nil {
		t.Fatalf("submit bfi-2: %v", err)
	}
	result, err := service.Submit(ctx, apptesting.SubmitInput{
		UserID:   "client-current",
		TestCode: apptesting.CodeEmotional,
		Score:    44,
		Answers:  bdsAnswersForTotal(44),
	})
	if err != nil {
		t.Fatalf("submit bds: %v", err)
	}

	if !result.VertexAdded {
		t.Fatal("BDS after BFI-2 must add a vertex")
	}
	if notifier.calls != 1 {
		t.Fatalf("notifications = %d, want 1", notifier.calls)
	}
	if len(notifier.lastRecipients) != 1 || notifier.lastRecipients[0] != "belova@example.com" {
		t.Fatalf("recipients = %v, want [belova@example.com]", notifier.lastRecipients)
	}
}

func TestRetakingBDSAddsAnotherVertex(t *testing.T) {
	s := newScene(t)
	s.submit(t, apptesting.CodePsychotype, 3.6, "")
	s.submit(t, apptesting.CodeEmotional, 44, "Умеренный дистресс")

	// Повторный BDS берёт последний BFI-2 из БД и добавляет новую точку графа.
	if res := s.submit(t, apptesting.CodeEmotional, 48, "Высокий дистресс"); !res.VertexAdded {
		t.Fatal("retaking BDS after BFI-2 must add a second vertex")
	}
	if got := pointsCount(t, s); got != 2 {
		t.Fatalf("graph points = %d, want 2", got)
	}
	if s.notifier.calls != 2 {
		t.Fatalf("notifications = %d, want 2", s.notifier.calls)
	}
}

func TestCreateTestPersistsManualQuestionnaire(t *testing.T) {
	tests := memory.NewTestRepository()
	service := apptesting.NewService(apptesting.Deps{
		Tests: tests,
		IDs:   &seqIDs{},
		Clock: &stepClock{base: time.Date(2026, 5, 30, 12, 0, 0, 0, time.UTC), step: time.Minute},
	})

	created, err := service.CreateTest(context.Background(), apptesting.CreateTestInput{
		AuthorID:  "spec-1",
		Title:     "Шкала состояния после сессии",
		Code:      "session-state",
		Questions: []string{"Я понимаю свое текущее состояние.", "Мне хватает поддержки."},
	})
	if err != nil {
		t.Fatalf("create test: %v", err)
	}
	if created.Code != "custom-session-state" {
		t.Fatalf("code = %q, want custom-session-state", created.Code)
	}

	items, err := service.ListTests(context.Background())
	if err != nil {
		t.Fatalf("list tests: %v", err)
	}
	if len(items) != 1 || items[0].Title != created.Title || len(items[0].Questions) != 2 {
		t.Fatalf("items = %+v, want created test with two questions", items)
	}
}

func TestSubmitCustomTestResultDoesNotAddGraphVertex(t *testing.T) {
	tests := memory.NewTestRepository()
	if err := tests.Create(context.Background(), domaintest.Test{
		ID:     "custom-id",
		Code:   "custom-session-state",
		Title:  "Шкала состояния после сессии",
		Status: "active",
	}); err != nil {
		t.Fatalf("seed test: %v", err)
	}

	graphs := memory.NewEmotionGraphRepository()
	service := apptesting.NewService(apptesting.Deps{
		Tests:   tests,
		Results: memory.NewTestResultRepository(),
		Graphs:  graphs,
		IDs:     &seqIDs{},
		Clock:   &stepClock{base: time.Date(2026, 5, 30, 12, 0, 0, 0, time.UTC), step: time.Minute},
	})

	result, err := service.Submit(context.Background(), apptesting.SubmitInput{
		UserID:   "client",
		TestCode: "custom-session-state",
		Score:    4.2,
	})
	if err != nil {
		t.Fatalf("submit custom test: %v", err)
	}
	if result.VertexAdded {
		t.Fatal("custom test must not add graph vertex")
	}
	if graph, err := graphs.FindByUser(context.Background(), "client"); err == nil && len(graph.Points) != 0 {
		t.Fatalf("graph points = %d, want 0", len(graph.Points))
	}
}

func TestGraphDoesNotBackfillMissingBDSVertexFromStoredResults(t *testing.T) {
	results := memory.NewTestResultRepository()
	graphs := memory.NewEmotionGraphRepository()
	service := apptesting.NewService(apptesting.Deps{
		Results: results,
		Graphs:  graphs,
		IDs:     &seqIDs{},
		Clock:   &stepClock{base: time.Date(2026, 6, 3, 12, 0, 0, 0, time.UTC), step: time.Minute},
	})
	completedBFIAt := time.Date(2026, 6, 3, 10, 0, 0, 0, time.UTC)
	completedBDSAt := time.Date(2026, 6, 3, 11, 0, 0, 0, time.UTC)

	if err := results.Create(context.Background(), domaintest.TestResult{
		ID:          "bfi-result",
		UserID:      "client",
		TestID:      apptesting.CodePsychotype,
		TestCode:    apptesting.CodePsychotype,
		Domains:     referenceBFIDomains(),
		CompletedAt: completedBFIAt,
	}); err != nil {
		t.Fatalf("seed bfi result: %v", err)
	}
	if err := results.Create(context.Background(), domaintest.TestResult{
		ID:          "bds-result",
		UserID:      "client",
		TestID:      apptesting.CodeEmotional,
		TestCode:    apptesting.CodeEmotional,
		Score:       44,
		Answers:     bdsAnswersForTotal(44),
		CompletedAt: completedBDSAt,
	}); err != nil {
		t.Fatalf("seed bds result: %v", err)
	}

	graph, err := service.Graph(context.Background(), "client")
	if err != nil {
		t.Fatalf("graph: %v", err)
	}
	if len(graph.Points) != 0 {
		t.Fatalf("graph points = %d, want 0", len(graph.Points))
	}
}

func TestGraphPreservesExistingLegacyPointsWithoutBackfillingDeletedBDS(t *testing.T) {
	results := memory.NewTestResultRepository()
	graphs := memory.NewEmotionGraphRepository()
	service := apptesting.NewService(apptesting.Deps{
		Results: results,
		Graphs:  graphs,
		IDs:     &seqIDs{},
		Clock:   &stepClock{base: time.Date(2026, 6, 3, 12, 0, 0, 0, time.UTC), step: time.Minute},
	})
	ctx := context.Background()
	for index := 0; index < 5; index++ {
		if err := graphs.AppendPoint(ctx, "client", emotion.Point{
			Date:        time.Date(2025, 9, 20+index, 12, 0, 0, 0, time.UTC),
			SupportNeed: 50,
			Level:       "средняя",
		}); err != nil {
			t.Fatalf("seed legacy point %d: %v", index, err)
		}
	}

	completedBFIAt := time.Date(2026, 6, 3, 10, 0, 0, 0, time.UTC)
	completedBDSAt := time.Date(2026, 6, 3, 11, 0, 0, 0, time.UTC)
	if err := results.Create(ctx, domaintest.TestResult{
		ID:          "bfi-result",
		UserID:      "client",
		TestID:      apptesting.CodePsychotype,
		TestCode:    apptesting.CodePsychotype,
		Domains:     referenceBFIDomains(),
		CompletedAt: completedBFIAt,
	}); err != nil {
		t.Fatalf("seed bfi result: %v", err)
	}
	if err := results.Create(ctx, domaintest.TestResult{
		ID:          "bds-result",
		UserID:      "client",
		TestID:      apptesting.CodeEmotional,
		TestCode:    apptesting.CodeEmotional,
		Score:       44,
		Answers:     bdsAnswersForTotal(44),
		CompletedAt: completedBDSAt,
	}); err != nil {
		t.Fatalf("seed bds result: %v", err)
	}

	graph, err := service.Graph(ctx, "client")
	if err != nil {
		t.Fatalf("graph: %v", err)
	}
	if len(graph.Points) != 5 {
		t.Fatalf("graph points = %d, want 5", len(graph.Points))
	}
	for _, point := range graph.Points {
		if point.Date.Equal(completedBDSAt) {
			t.Fatalf("graph unexpectedly restored deleted BDS point at %s", completedBDSAt)
		}
	}
}

func pointsCount(t *testing.T, s scene) int {
	t.Helper()
	graph, err := s.graphs.FindByUser(context.Background(), s.clientID)
	if err != nil {
		t.Fatalf("find graph: %v", err)
	}
	return len(graph.Points)
}
