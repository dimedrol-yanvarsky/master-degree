package memory

import (
	"sync"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/application/port"
)

// Проверка на этапе компиляции: адаптер удовлетворяет порту приложения.
var _ port.AttemptLimiter = (*AttemptLimiter)(nil)

// AttemptLimiter — счётчик неудачных входов в памяти, реализует
// port.AttemptLimiter. Ключ (напр. email) блокируется при достижении заданного
// максимума подряд идущих неудач.
type AttemptLimiter struct {
	mu       sync.Mutex
	failures map[string]int
	max      int
}

// NewAttemptLimiter создаёт ограничитель, допускающий до max подряд неудач.
func NewAttemptLimiter(max int) *AttemptLimiter {
	if max <= 0 {
		max = 5
	}
	return &AttemptLimiter{failures: make(map[string]int), max: max}
}

// Allowed сообщает, разрешены ли ещё попытки для ключа.
func (l *AttemptLimiter) Allowed(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.failures[key] < l.max
}

// Fail фиксирует неудачную попытку для ключа.
func (l *AttemptLimiter) Fail(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.failures[key]++
}

// Reset обнуляет счётчик неудач для ключа (вызывается при успешном входе).
func (l *AttemptLimiter) Reset(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.failures, key)
}
