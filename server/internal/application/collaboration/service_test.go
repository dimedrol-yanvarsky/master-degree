package collaboration

import (
	"context"
	"errors"
	"testing"
	"time"

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
	g.index += 1
	return id
}

type testClock struct {
	value time.Time
}

func (c testClock) Now() time.Time {
	return c.value
}

func TestClientRequestCanBeAcceptedBySpecialist(t *testing.T) {
	ctx := context.Background()
	svc := newTestService(t, "collab-1")

	request, err := svc.CreateRequest(ctx, "client-1", "specialist-1")
	if err != nil {
		t.Fatalf("create request: %v", err)
	}
	if request.Direction != directionOutgoing || request.CanRespond {
		t.Fatalf("client request direction = %q, canRespond = %v", request.Direction, request.CanRespond)
	}

	specialistRequests, err := svc.ListWorkRequests(ctx, "specialist-1")
	if err != nil {
		t.Fatalf("list specialist requests: %v", err)
	}
	if len(specialistRequests) != 1 {
		t.Fatalf("specialist requests count = %d", len(specialistRequests))
	}
	if specialistRequests[0].Direction != directionIncoming || !specialistRequests[0].CanRespond {
		t.Fatalf("specialist request direction = %q, canRespond = %v", specialistRequests[0].Direction, specialistRequests[0].CanRespond)
	}

	accepted, err := svc.RespondToRequest(ctx, "specialist-1", "collab-1", "accepted")
	if err != nil {
		t.Fatalf("accept request: %v", err)
	}
	if accepted.Direction != directionAccepted || accepted.CanRespond {
		t.Fatalf("accepted direction = %q, canRespond = %v", accepted.Direction, accepted.CanRespond)
	}
}

func TestSpecialistRequestCanBeRejectedByClientOnly(t *testing.T) {
	ctx := context.Background()
	svc := newTestService(t, "collab-2")

	if _, err := svc.CreateRequest(ctx, "specialist-1", "client-1"); err != nil {
		t.Fatalf("create specialist request: %v", err)
	}
	if _, err := svc.RespondToRequest(ctx, "specialist-1", "collab-2", "accepted"); !errors.Is(err, shared.ErrForbidden) {
		t.Fatalf("specialist response error = %v, want forbidden", err)
	}

	clientRequests, err := svc.ListWorkRequests(ctx, "client-1")
	if err != nil {
		t.Fatalf("list client requests: %v", err)
	}
	if len(clientRequests) != 1 {
		t.Fatalf("client requests count = %d", len(clientRequests))
	}
	if clientRequests[0].Direction != directionIncoming || !clientRequests[0].CanRespond {
		t.Fatalf("client request direction = %q, canRespond = %v", clientRequests[0].Direction, clientRequests[0].CanRespond)
	}

	if _, err := svc.RespondToRequest(ctx, "client-1", "collab-2", "rejected"); err != nil {
		t.Fatalf("reject request: %v", err)
	}
	clientRequests, err = svc.ListWorkRequests(ctx, "client-1")
	if err != nil {
		t.Fatalf("list client requests after reject: %v", err)
	}
	if len(clientRequests) != 0 {
		t.Fatalf("client requests after reject count = %d", len(clientRequests))
	}
}

func newTestService(t *testing.T, id string) *Service {
	t.Helper()
	ctx := context.Background()
	users := memory.NewUserRepository()
	collaborations := memory.NewCollaborationRepository()
	accounts := []user.User{
		{ID: "client-1", Email: "client@example.com", Name: "Иван", Surname: "Клиентов", Role: shared.RoleClient, Status: shared.AccountActive},
		{ID: "specialist-1", Email: "specialist@example.com", Name: "Марина", Surname: "Специалистова", Role: shared.RoleSpecialist, Status: shared.AccountActive},
	}
	for _, account := range accounts {
		if err := users.Create(ctx, account); err != nil {
			t.Fatalf("create user %s: %v", account.ID, err)
		}
	}

	return NewService(Deps{
		Collaborations: collaborations,
		Users:          users,
		IDs:            &testIDs{values: []string{id}},
		Clock:          testClock{value: time.Date(2026, 5, 31, 12, 0, 0, 0, time.UTC)},
	})
}
