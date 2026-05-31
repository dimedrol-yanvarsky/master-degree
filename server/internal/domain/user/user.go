// Пакет user — доменная модель подсистемы обработки учётных записей
// (РПЗ §2.2.1, ТЗ §5.1.1): пользователи, их роли/статусы и сессии аутентификации.
package user

import (
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
)

// User — учётная запись системы: клиент, специалист или администратор.
// Пароль в открытом виде не хранится — только его bcrypt-хеш.
type User struct {
	ID                     string
	Email                  string
	Name                   string
	Surname                string
	Patronymic             string
	About                  string
	Experience             string
	PasswordHash           string
	PasswordResetTokenHash string
	PasswordResetExpiresAt *time.Time
	Role                   shared.Role
	Status                 shared.AccountStatus
	YandexLinked           bool
	CreatedAt              time.Time
}

// Session — запись об аутентифицированном входе. Хранится только хеш выданного
// токена, поэтому утечка БД не раскрывает пригодные токены.
type Session struct {
	ID        string
	UserID    string
	TokenHash string
	UserAgent string
	IP        string
	CreatedAt time.Time
	ExpiresAt time.Time
	RevokedAt *time.Time
}

// Active сообщает, что сессия не отозвана и не истекла на момент now.
func (s Session) Active(now time.Time) bool {
	return s.RevokedAt == nil && now.Before(s.ExpiresAt)
}
