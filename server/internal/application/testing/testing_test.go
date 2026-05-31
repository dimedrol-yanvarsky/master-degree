package testing_test

import (
	"context"
	"strconv"
	"testing"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/application/port"
	apptesting "github.com/dimedrol-yanvarsky/master-degree/server/internal/application/testing"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/collaboration"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
	domaintest "github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/test"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/user"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/infrastructure/persistence/memory"
)

// --- вспомогательные фейки -------------------------------------------------

type captureNotifier struct {
	calls          int
	lastRecipients []string
}

func (n *captureNotifier) NotifyNewGraphPoint(_ context.Context, notification port.SpecialistNotification) error {
	n.calls++
	n.lastRecipients = notification.Recipients
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

func TestNotifiesOnlyAcceptedCollaboratingSpecialists(t *testing.T) {
	s := newScene(t)
	s.submit(t, apptesting.CodePsychotype, 3.6, "")
	s.submit(t, apptesting.CodeEmotional, 44, "Умеренный дистресс")

	if len(s.notifier.lastRecipients) != 1 || s.notifier.lastRecipients[0] != "accepted@spec.com" {
		t.Fatalf("recipients = %v, want [accepted@spec.com]", s.notifier.lastRecipients)
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

func pointsCount(t *testing.T, s scene) int {
	t.Helper()
	graph, err := s.graphs.FindByUser(context.Background(), s.clientID)
	if err != nil {
		t.Fatalf("find graph: %v", err)
	}
	return len(graph.Points)
}
