package memory

import (
	"context"
	"sync"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/user"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
)

// Проверка на этапе компиляции: адаптер удовлетворяет порту приложения.
var _ port.SessionRepository = (*SessionRepository)(nil)

// SessionRepository — хранилище сессий в памяти.
type SessionRepository struct {
	mu       sync.RWMutex
	sessions map[string]user.Session
}

// NewSessionRepository создаёт пустое хранилище сессий в памяти.
func NewSessionRepository() *SessionRepository {
	return &SessionRepository{sessions: make(map[string]user.Session)}
}

func (r *SessionRepository) Create(_ context.Context, s user.Session) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.sessions[s.ID]; exists {
		return shared.ErrConflict
	}
	r.sessions[s.ID] = s
	return nil
}

func (r *SessionRepository) FindByID(_ context.Context, id string) (user.Session, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	s, ok := r.sessions[id]
	if !ok {
		return user.Session{}, shared.ErrNotFound
	}
	return s, nil
}

func (r *SessionRepository) Revoke(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	s, ok := r.sessions[id]
	if !ok {
		return shared.ErrNotFound
	}
	now := time.Now()
	s.RevokedAt = &now
	r.sessions[id] = s
	return nil
}

func (r *SessionRepository) RevokeAllForUser(_ context.Context, userID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	for id, s := range r.sessions {
		if s.UserID == userID && s.RevokedAt == nil {
			s.RevokedAt = &now
			r.sessions[id] = s
		}
	}
	return nil
}
