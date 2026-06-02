// Пакет emotion — доменная модель графа эмоционального состояния: траектория
// уровня потребности пользователя в поддержке во времени (модифицированная
// модель Крипке, РПЗ §1.2).
package emotion

import "time"

// Point — одно измерение на графе: вычисленное значение потребности в поддержке
// и её качественный уровень на заданную дату.
type Point struct {
	Date                      time.Time
	SupportNeed               float64
	SupportNeedLevel          int
	SecondarySupportNeedLevel int
	Score                     float64
	SecondaryScore            float64
	Truth                     float64
	Level                     string
}

// Graph — упорядоченный набор точек одного пользователя.
type Graph struct {
	ID     string
	UserID string
	Points []Point
}
