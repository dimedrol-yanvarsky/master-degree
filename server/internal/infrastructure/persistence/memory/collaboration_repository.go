package memory

import (
	"context"
	"sync"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/application/port"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/collaboration"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
)

var _ port.CollaborationRepository = (*CollaborationRepository)(nil)

// CollaborationRepository — хранилище связей специалист↔клиент в памяти.
type CollaborationRepository struct {
	mu   sync.RWMutex
	byID map[string]collaboration.Collaboration
}

// NewCollaborationRepository создаёт пустое хранилище связей.
func NewCollaborationRepository() *CollaborationRepository {
	return &CollaborationRepository{byID: make(map[string]collaboration.Collaboration)}
}

func (r *CollaborationRepository) Create(_ context.Context, c collaboration.Collaboration) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.byID[c.ID]; exists {
		return shared.ErrConflict
	}
	r.byID[c.ID] = c
	return nil
}

func (r *CollaborationRepository) FindByID(_ context.Context, id string) (collaboration.Collaboration, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	c, ok := r.byID[id]
	if !ok {
		return collaboration.Collaboration{}, shared.ErrNotFound
	}
	return c, nil
}

func (r *CollaborationRepository) FindBetween(_ context.Context, specialistID, clientID string) (collaboration.Collaboration, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, c := range r.byID {
		if c.SpecialistID == specialistID && c.ClientID == clientID {
			return c, nil
		}
	}
	return collaboration.Collaboration{}, shared.ErrNotFound
}

func (r *CollaborationRepository) ListByClient(_ context.Context, clientID string) ([]collaboration.Collaboration, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []collaboration.Collaboration
	for _, c := range r.byID {
		if c.ClientID == clientID {
			result = append(result, c)
		}
	}
	return result, nil
}

func (r *CollaborationRepository) Update(_ context.Context, c collaboration.Collaboration) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.byID[c.ID]; !ok {
		return shared.ErrNotFound
	}
	r.byID[c.ID] = c
	return nil
}
