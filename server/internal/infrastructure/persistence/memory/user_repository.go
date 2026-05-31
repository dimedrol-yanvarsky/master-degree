// Пакет memory — реализации портов-репозиториев в оперативной памяти. Позволяют
// запускать сервер целиком, пока конкретные репозитории MongoDB (с привязкой
// коллекций) намеренно отложены. Не предназначены для продакшена.
package memory

import (
	"context"
	"strings"
	"sync"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/application/port"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/user"
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

func (r *UserRepository) Update(_ context.Context, u user.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.byID[u.ID]; !ok {
		return shared.ErrNotFound
	}
	r.byID[u.ID] = u
	r.byEmail[strings.ToLower(u.Email)] = u.ID
	return nil
}
