// Пакет security — инфраструктурные примитивы технологии разграничения доступа
// (ТЗ часть 3): хеширование паролей (bcrypt) и подписанные токены доступа (JWT).
package security

import (
	"golang.org/x/crypto/bcrypt"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
)

// Проверка на этапе компиляции: адаптер удовлетворяет порту приложения.
var _ port.PasswordHasher = (*PasswordHasher)(nil)

// PasswordHasher хеширует и проверяет пароли через bcrypt. bcrypt выбран за
// настраиваемый фактор стоимости и соль на каждый хеш: утечка БД не раскрывает
// пригодные пароли (РПЗ §3.2).
type PasswordHasher struct {
	cost int
}

// NewPasswordHasher создаёт хешер с заданной стоимостью, сводя недопустимые
// значения к стандартной стоимости bcrypt.
func NewPasswordHasher(cost int) *PasswordHasher {
	if cost < bcrypt.MinCost || cost > bcrypt.MaxCost {
		cost = bcrypt.DefaultCost
	}
	return &PasswordHasher{cost: cost}
}

// Hash возвращает bcrypt-хеш пароля.
func (h *PasswordHasher) Hash(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), h.cost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// Compare сообщает, соответствует ли пароль сохранённому хешу.
func (h *PasswordHasher) Compare(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}
