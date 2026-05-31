// Пакет system — инфраструктурные реализации небольших платформенных портов,
// например часов.
package system

import (
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/application/port"
)

// Проверка на этапе компиляции: адаптер удовлетворяет порту приложения.
var _ port.Clock = Clock{}

// Clock — боевая реализация port.Clock.
type Clock struct{}

// Now возвращает текущее время в UTC.
func (Clock) Now() time.Time {
	return time.Now().UTC()
}
