// Пакет memory — реализации портов-репозиториев в оперативной памяти. Позволяют
// запускать сервер целиком, пока конкретные репозитории MongoDB (с привязкой
// коллекций) намеренно отложены. Не предназначены для продакшена.
package memory

import (
	"context"
	"sort"
	"strings"
	"sync"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/user"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
)

// Проверка на этапе компиляции: адаптер удовлетворяет порту приложения, от
// которого зависит (инверсия зависимостей: внешний слой реализует внутреннюю
// абстракцию).
var _ port.UserRepository = (*UserRepository)(nil)

// UserRepository — хранилище пользователей в памяти.
type UserRepository struct {
	mu      sync.RWMutex
	byID    map[string]user.User
	byEmail map[string]string // email -> id
}

// NewUserRepository создаёт пустое хранилище пользователей в памяти.
func NewUserRepository() *UserRepository {
	return &UserRepository{
		byID:    make(map[string]user.User),
		byEmail: make(map[string]string),
	}
}

func (r *UserRepository) Create(_ context.Context, u user.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	email := strings.ToLower(u.Email)
	if _, exists := r.byID[u.ID]; exists {
		return shared.ErrConflict
	}
	if _, exists := r.byEmail[email]; exists {
		return shared.ErrConflict
	}

	r.byID[u.ID] = u
	r.byEmail[email] = u.ID
	return nil
}

func (r *UserRepository) FindByID(_ context.Context, id string) (user.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	u, ok := r.byID[id]
	if !ok {
		return user.User{}, shared.ErrNotFound
	}
	return u, nil
}

func (r *UserRepository) FindByEmail(_ context.Context, email string) (user.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	id, ok := r.byEmail[strings.ToLower(email)]
	if !ok {
		return user.User{}, shared.ErrNotFound
	}
	return r.byID[id], nil
}

func (r *UserRepository) List(_ context.Context) ([]user.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	items := make([]user.User, 0, len(r.byID))
	for _, u := range r.byID {
		items = append(items, u)
	}
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].CreatedAt.Equal(items[j].CreatedAt) {
			return items[i].Email < items[j].Email
		}
		return items[i].CreatedAt.After(items[j].CreatedAt)
	})
	return items, nil
}

func (r *UserRepository) Update(_ context.Context, u user.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	current, ok := r.byID[u.ID]
	if !ok {
		return shared.ErrNotFound
	}
	email := strings.ToLower(strings.TrimSpace(u.Email))
	if ownerID, exists := r.byEmail[email]; exists && ownerID != u.ID {
		return shared.ErrConflict
	}
	delete(r.byEmail, strings.ToLower(strings.TrimSpace(current.Email)))
	r.byID[u.ID] = u
	r.byEmail[email] = u.ID
	return nil
}
