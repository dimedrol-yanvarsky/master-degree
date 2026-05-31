package memory

import (
	"context"
	"sort"
	"sync"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/application/port"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/recommendation"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
)

var _ port.RecommendationAssignmentRepository = (*RecommendationAssignmentRepository)(nil)

// RecommendationAssignmentRepository хранит назначенные рекомендации в памяти
// для локального запуска без MongoDB.
type RecommendationAssignmentRepository struct {
	mu   sync.RWMutex
	byID map[string]recommendation.Assignment
}

func NewRecommendationAssignmentRepository() *RecommendationAssignmentRepository {
	return &RecommendationAssignmentRepository{byID: make(map[string]recommendation.Assignment)}
}

func (r *RecommendationAssignmentRepository) Create(_ context.Context, assignment recommendation.Assignment) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.byID[assignment.ID]; exists {
		return shared.ErrConflict
	}
	r.byID[assignment.ID] = assignment
	return nil
}

func (r *RecommendationAssignmentRepository) FindByID(_ context.Context, id string) (recommendation.Assignment, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	assignment, ok := r.byID[id]
	if !ok || assignment.Status == "deleted" {
		return recommendation.Assignment{}, shared.ErrNotFound
	}
	return assignment, nil
}

func (r *RecommendationAssignmentRepository) ListByClient(_ context.Context, clientID string) ([]recommendation.Assignment, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	items := make([]recommendation.Assignment, 0)
	for _, assignment := range r.byID {
		if assignment.ClientID == clientID && assignment.Status != "deleted" {
			items = append(items, assignment)
		}
	}
	sortAssignments(items)
	return items, nil
}

func (r *RecommendationAssignmentRepository) ListBySpecialist(_ context.Context, specialistID string) ([]recommendation.Assignment, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	items := make([]recommendation.Assignment, 0)
	for _, assignment := range r.byID {
		if assignment.SpecialistID == specialistID && assignment.Status != "deleted" {
			items = append(items, assignment)
		}
	}
	sortAssignments(items)
	return items, nil
}

func (r *RecommendationAssignmentRepository) Update(_ context.Context, assignment recommendation.Assignment) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.byID[assignment.ID]; !exists {
		return shared.ErrNotFound
	}
	r.byID[assignment.ID] = assignment
	return nil
}

func sortAssignments(items []recommendation.Assignment) {
	sort.SliceStable(items, func(i, j int) bool {
		return items[i].AssignedAt.After(items[j].AssignedAt)
	})
}
