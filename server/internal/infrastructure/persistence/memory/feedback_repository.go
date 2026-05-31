package memory

import (
	"context"
	"sort"
	"sync"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/application/port"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/feedback"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
)

var _ port.FeedbackRepository = (*FeedbackRepository)(nil)

// FeedbackRepository — in-memory хранилище отзывов для локального запуска без MongoDB.
type FeedbackRepository struct {
	mu   sync.RWMutex
	byID map[string]feedback.Feedback
}

func NewFeedbackRepository() *FeedbackRepository {
	return &FeedbackRepository{byID: make(map[string]feedback.Feedback)}
}

func (r *FeedbackRepository) Create(_ context.Context, item feedback.Feedback) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.byID[item.ID]; exists {
		return shared.ErrConflict
	}
	r.byID[item.ID] = item
	return nil
}

func (r *FeedbackRepository) List(_ context.Context) ([]feedback.Feedback, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	items := make([]feedback.Feedback, 0, len(r.byID))
	for _, item := range r.byID {
		if item.Status == "deleted" {
			continue
		}
		items = append(items, item)
	}
	sort.SliceStable(items, func(i, j int) bool {
		return items[i].CreatedAt.After(items[j].CreatedAt)
	})
	return items, nil
}

func (r *FeedbackRepository) FindByID(_ context.Context, id string) (feedback.Feedback, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	item, ok := r.byID[id]
	if !ok || item.Status == "deleted" {
		return feedback.Feedback{}, shared.ErrNotFound
	}
	return item, nil
}

func (r *FeedbackRepository) Update(_ context.Context, item feedback.Feedback) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.byID[item.ID]; !ok {
		return shared.ErrNotFound
	}
	r.byID[item.ID] = item
	return nil
}

func (r *FeedbackRepository) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	item, ok := r.byID[id]
	if !ok {
		return shared.ErrNotFound
	}
	item.Status = "deleted"
	r.byID[id] = item
	return nil
}
