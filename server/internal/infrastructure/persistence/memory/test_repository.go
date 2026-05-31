package memory

import (
	"context"
	"sort"
	"strings"
	"sync"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/application/port"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/test"
)

var _ port.TestRepository = (*TestRepository)(nil)

// TestRepository — in-memory хранилище опросников для локального запуска без MongoDB.
type TestRepository struct {
	mu     sync.RWMutex
	byID   map[string]test.Test
	byCode map[string]string
}

func NewTestRepository() *TestRepository {
	return &TestRepository{
		byID:   make(map[string]test.Test),
		byCode: make(map[string]string),
	}
}

func (r *TestRepository) Create(_ context.Context, t test.Test) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	code := normalizeTestCode(t.Code)
	if _, exists := r.byID[t.ID]; exists {
		return shared.ErrConflict
	}
	if code != "" {
		if _, exists := r.byCode[code]; exists {
			return shared.ErrConflict
		}
	}

	r.byID[t.ID] = t
	if code != "" {
		r.byCode[code] = t.ID
	}
	return nil
}

func (r *TestRepository) FindByID(_ context.Context, id string) (test.Test, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if item, ok := r.byID[id]; ok {
		return item, nil
	}
	if id, ok := r.byCode[normalizeTestCode(id)]; ok {
		return r.byID[id], nil
	}
	return test.Test{}, shared.ErrNotFound
}

func (r *TestRepository) List(_ context.Context) ([]test.Test, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	items := make([]test.Test, 0, len(r.byID))
	for _, item := range r.byID {
		if item.Status != "" && item.Status != "active" {
			continue
		}
		items = append(items, item)
	}
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].CreatedAt.Equal(items[j].CreatedAt) {
			return items[i].Title < items[j].Title
		}
		return items[i].CreatedAt.Before(items[j].CreatedAt)
	})
	return items, nil
}

func (r *TestRepository) Update(_ context.Context, t test.Test) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	current, ok := r.byID[t.ID]
	if !ok {
		return shared.ErrNotFound
	}
	oldCode := normalizeTestCode(current.Code)
	newCode := normalizeTestCode(t.Code)
	if ownerID, exists := r.byCode[newCode]; newCode != "" && exists && ownerID != t.ID {
		return shared.ErrConflict
	}

	delete(r.byCode, oldCode)
	r.byID[t.ID] = t
	if newCode != "" {
		r.byCode[newCode] = t.ID
	}
	return nil
}

func (r *TestRepository) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	current, ok := r.byID[id]
	if !ok {
		if resolvedID, exists := r.byCode[normalizeTestCode(id)]; exists {
			id = resolvedID
			current = r.byID[resolvedID]
			ok = true
		}
	}
	if !ok {
		return shared.ErrNotFound
	}

	delete(r.byCode, normalizeTestCode(current.Code))
	current.Status = "deleted"
	r.byID[id] = current
	return nil
}

func normalizeTestCode(code string) string {
	return strings.ToLower(strings.TrimSpace(code))
}
