package recommendation

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/collaboration"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/user"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/infrastructure/persistence/memory"
)

type testIDs struct {
	values []string
	index  int
}

func (g *testIDs) NewID() string {
	if g.index >= len(g.values) {
		return ""
	}
	id := g.values[g.index]
	g.index++
	return id
}

type testClock struct {
	value time.Time
}

func (c testClock) Now() time.Time {
	return c.value
}

func TestAssignToClientStoresRecommendationForAcceptedCollaboration(t *testing.T) {
	ctx := context.Background()
	now := time.Date(2026, 5, 31, 12, 0, 0, 0, time.UTC)
	service := newAssignmentTestService(t, collaboration.StatusAccepted, now)

	assigned, err := service.AssignToClient(ctx, "specialist-1", "client-1", "  Вести дневник состояния 7 дней.  ")
	if err != nil {
		t.Fatalf("assign recommendation: %v", err)
	}
	if assigned.ID != "assignment-1" || assigned.Text != "Вести дневник состояния 7 дней." {
		t.Fatalf("assigned item = %+v", assigned)
	}
	if assigned.SpecialistName != "Специалистова Марина" || assigned.SpecialistEmail != "specialist@example.com" {
		t.Fatalf("specialist fields = %q/%q", assigned.SpecialistName, assigned.SpecialistEmail)
	}

	items, err := service.ListClientAssignments(ctx, "client-1")
	if err != nil {
		t.Fatalf("list assignments: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("assignments count = %d, want 1", len(items))
	}
	if !items[0].AssignedAt.Equal(now) || items[0].Status != assignmentStatusActive {
		t.Fatalf("assignment metadata = %+v", items[0])
	}
}

func TestAssignToClientRequiresAcceptedCollaboration(t *testing.T) {
	ctx := context.Background()
	service := newAssignmentTestService(t, collaboration.StatusPendingSpecialist, time.Now())

	_, err := service.AssignToClient(ctx, "specialist-1", "client-1", "Рекомендация")
	if !errors.Is(err, shared.ErrForbidden) {
		t.Fatalf("assign error = %v, want forbidden", err)
	}
}

func newAssignmentTestService(t *testing.T, status collaboration.Status, now time.Time) *Service {
	t.Helper()
	ctx := context.Background()
	users := memory.NewUserRepository()
	collaborations := memory.NewCollaborationRepository()

	accounts := []user.User{
		{ID: "specialist-1", Email: "specialist@example.com", Name: "Марина", Surname: "Специалистова", Role: shared.RoleSpecialist, Status: shared.AccountActive},
		{ID: "client-1", Email: "client@example.com", Name: "Иван", Surname: "Клиентов", Role: shared.RoleClient, Status: shared.AccountActive},
	}
	for _, account := range accounts {
		if err := users.Create(ctx, account); err != nil {
			t.Fatalf("create user %s: %v", account.ID, err)
		}
	}
	if err := collaborations.Create(ctx, collaboration.Collaboration{
		ID:           "collaboration-1",
		SpecialistID: "specialist-1",
		ClientID:     "client-1",
		StartedAt:    now,
		Status:       status,
	}); err != nil {
		t.Fatalf("create collaboration: %v", err)
	}

	return NewService(Deps{
		Assignments:    memory.NewRecommendationAssignmentRepository(),
		Collaborations: collaborations,
		Users:          users,
		IDs:            &testIDs{values: []string{"assignment-1"}},
		Clock:          testClock{value: now},
	})
}
