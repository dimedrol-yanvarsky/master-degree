// Пакет feedback — доменная модель подсистемы отзывов о сервисе.
package feedback

import "time"

// Feedback — отзыв пользователя о сервисе. Хранится отдельно от пользователя,
// чтобы его можно было скрыть, не удаляя аккаунт.
type Feedback struct {
	ID        string
	UserID    string
	Body      string
	CreatedAt time.Time
	Status    string
}
