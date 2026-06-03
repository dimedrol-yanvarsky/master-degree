package recommendation

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/adapters/persistence/memory"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/collaboration"
	domainrecommendation "github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/recommendation"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/user"
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

type recommendationRepo struct {
	items map[string]domainrecommendation.Block
}

func newRecommendationRepo(items ...domainrecommendation.Block) *recommendationRepo {
	repo := &recommendationRepo{items: make(map[string]domainrecommendation.Block)}
	for _, item := range items {
		repo.items[item.ID] = item
	}
	return repo
}

func (r *recommendationRepo) Create(_ context.Context, item domainrecommendation.Block) error {
	r.items[item.ID] = item
	return nil
}

func (r *recommendationRepo) FindByID(_ context.Context, id string) (domainrecommendation.Block, error) {
	item, ok := r.items[id]
	if !ok {
		return domainrecommendation.Block{}, shared.ErrNotFound
	}
	return item, nil
}

func (r *recommendationRepo) List(_ context.Context) ([]domainrecommendation.Block, error) {
	items := make([]domainrecommendation.Block, 0, len(r.items))
	for _, item := range r.items {
		items = append(items, item)
	}
	return items, nil
}

func (r *recommendationRepo) Update(_ context.Context, item domainrecommendation.Block) error {
	if _, ok := r.items[item.ID]; !ok {
		return shared.ErrNotFound
	}
	r.items[item.ID] = item
	return nil
}

func (r *recommendationRepo) Delete(_ context.Context, id string) error {
	if _, ok := r.items[id]; !ok {
		return shared.ErrNotFound
	}
	delete(r.items, id)
	return nil
}

func TestCreateSectionInsertsByRequestedNumberAndRenumbersSubtree(t *testing.T) {
	ctx := context.Background()
	repo := newRecommendationRepo(
		domainrecommendation.Block{
			ID:            "section-1",
			SectionTitle:  stringPointer("Первый"),
			SectionNumber: stringPointer("1"),
			SortOrder:     1,
			Status:        "active",
		},
		domainrecommendation.Block{
			ID:            "section-2",
			SectionTitle:  stringPointer("Второй"),
			SectionNumber: stringPointer("2"),
			SortOrder:     2,
			Status:        "active",
		},
		domainrecommendation.Block{
			ID:            "section-2-1",
			ParentID:      stringPointer("section-2"),
			SectionTitle:  stringPointer("Подраздел"),
			SectionNumber: stringPointer("2.1"),
			SortOrder:     1,
			Status:        "active",
		},
	)
	service := NewService(Deps{
		Repository: repo,
		IDs:        &testIDs{values: []string{"section-new"}},
	})

	created, err := service.CreateSection(ctx, "author-1", "root", "Новый второй", "2")
	if err != nil {
		t.Fatalf("create section: %v", err)
	}
	if created.ID != "section-new" || created.SectionNumber == nil || *created.SectionNumber != "2" || created.SortOrder != 2 {
		t.Fatalf("created section = %+v", created)
	}

	moved, err := repo.FindByID(ctx, "section-2")
	if err != nil {
		t.Fatalf("find moved section: %v", err)
	}
	if moved.SectionNumber == nil || *moved.SectionNumber != "3" || moved.SortOrder != 3 {
		t.Fatalf("moved section = %+v", moved)
	}

	child, err := repo.FindByID(ctx, "section-2-1")
	if err != nil {
		t.Fatalf("find child section: %v", err)
	}
	if child.SectionNumber == nil || *child.SectionNumber != "3.1" || child.SortOrder != 1 {
		t.Fatalf("child section = %+v", child)
	}
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
