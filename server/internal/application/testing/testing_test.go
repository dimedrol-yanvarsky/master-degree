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
	result, err := s.service.Submit(context.Background(), apptesting.SubmitInput{
		UserID:   s.clientID,
		TestCode: code,
		Score:    score,
		Level:    level,
	})
	if err != nil {
		t.Fatalf("submit %s: %v", code, err)
	}
	return result
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
	res := s.submit(t, apptesting.CodeEmotional, 1.9, "Умеренный дистресс")
	if !res.VertexAdded {
		t.Fatal("BDS after BFI-2 must add a vertex")
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
	s.submit(t, apptesting.CodeEmotional, 1.9, "Умеренный дистресс")

	if len(s.notifier.lastRecipients) != 1 || s.notifier.lastRecipients[0] != "accepted@spec.com" {
		t.Fatalf("recipients = %v, want [accepted@spec.com]", s.notifier.lastRecipients)
	}
}

func TestRetakingBothTestsAddsAnotherVertex(t *testing.T) {
	s := newScene(t)
	s.submit(t, apptesting.CodePsychotype, 3.6, "")
	s.submit(t, apptesting.CodeEmotional, 1.9, "Умеренный дистресс")

	// Повторный психотип сам по себе вершину не добавляет (пара ещё не закрыта).
	if res := s.submit(t, apptesting.CodePsychotype, 3.8, ""); res.VertexAdded {
		t.Fatal("second BFI-2 alone must not add a vertex")
	}
	// Повторный тест состояния закрывает вторую пару — появляется вторая вершина.
	if res := s.submit(t, apptesting.CodeEmotional, 2.4, "Высокий дистресс"); !res.VertexAdded {
		t.Fatal("retaking both tests must add a second vertex")
	}
	if got := pointsCount(t, s); got != 2 {
		t.Fatalf("graph points = %d, want 2", got)
	}
	if s.notifier.calls != 2 {
		t.Fatalf("notifications = %d, want 2", s.notifier.calls)
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
