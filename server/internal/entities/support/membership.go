// Пакет support реализует нечёткий вывод (Мамдани), оценивающий степень
// потребности пользователя в психологической поддержке по профилю личности
// (BFI-2) и текущему эмоциональному состоянию (BDS).
//
// Лингвистические переменные и функции принадлежности воспроизводят РПЗ §1.6
// (таблицы 14–20); конвейер вывода — §1.8 (фаззификация → активация правил →
// агрегация → дефаззификация центром тяжести).
package support

// MembershipFunc отображает чёткое значение в степень принадлежности [0, 1].
type MembershipFunc func(x float64) float64

// Ключи входных лингвистических переменных.
const (
	VarExtraversion      = "extraversion"
	VarAgreeableness     = "agreeableness"
	VarConscientiousness = "conscientiousness"
	VarNeuroticism       = "neuroticism"
	VarOpenness          = "openness"
	VarEmotionalState    = "emotional_state"
)

// Ключи термов черт личности.
const (
	TermLow  = "low"
	TermMid  = "mid"
	TermHigh = "high"
)

// Ключи термов эмоционального состояния.
const (
	TermExcellent = "excellent"
	TermGood      = "good"
	TermNormal    = "normal"
	TermBad       = "bad"
	TermVeryBad   = "very_bad"
)

// Ключи термов выхода (потребность в поддержке).
const (
	TermVeryLow  = "very_low"
	TermSupLow   = "support_low"
	TermSupMid   = "support_mid"
	TermSupHigh  = "support_high"
	TermVeryHigh = "very_high"
)

// ramp строит ограниченную линейную рампу из (x0 -> y0) в (x1 -> y1).
func ramp(x0, y0, x1, y1 float64) func(float64) float64 {
	return func(x float64) float64 {
		if x <= x0 {
			return y0
		}
		if x >= x1 {
			return y1
		}
		return y0 + (y1-y0)*(x-x0)/(x1-x0)
	}
}

// triangle строит треугольную функцию принадлежности с основаниями a, c и
// вершиной b.
func triangle(a, b, c float64) MembershipFunc {
	up := ramp(a, 0, b, 1)
	down := ramp(b, 1, c, 0)
	return func(x float64) float64 {
		switch {
		case x <= a || x >= c:
			return 0
		case x <= b:
			return up(x)
		default:
			return down(x)
		}
	}
}

// leftShoulder равна 1 до вершины peak, затем спадает до 0 в основании foot.
func leftShoulder(peak, foot float64) MembershipFunc {
	return func(x float64) float64 {
		switch {
		case x <= peak:
			return 1
		case x >= foot:
			return 0
		default:
			return (foot - x) / (foot - peak)
		}
	}
}

// rightShoulder растёт от 0 в основании foot до 1 в вершине peak и далее равна 1.
func rightShoulder(foot, peak float64) MembershipFunc {
	return func(x float64) float64 {
		switch {
		case x <= foot:
			return 0
		case x >= peak:
			return 1
		default:
			return (x - foot) / (peak - foot)
		}
	}
}

// traitTerms строит набор термов {low, mid, high} для черты личности по её
// нормативным среднему (m) и стандартному отклонению (sd): зоны перехода
// сходятся в m±sd, как в РПЗ таблицах 14–18.
func traitTerms(m, sd float64) map[string]MembershipFunc {
	low := m - sd
	high := m + sd
	return map[string]MembershipFunc{
		TermLow:  leftShoulder(low, m),
		TermMid:  triangle(low, m, high),
		TermHigh: rightShoulder(m, high),
	}
}

// emotionTerms строит набор термов эмоционального состояния на универсуме BDS
// [16, 64] (РПЗ таблица 19). Меньше балл — лучше состояние.
func emotionTerms() map[string]MembershipFunc {
	return map[string]MembershipFunc{
		TermExcellent: leftShoulder(20, 28),
		TermGood:      triangle(20, 28, 36),
		TermNormal:    triangle(28, 36, 44),
		TermBad:       triangle(36, 44, 52),
		TermVeryBad:   rightShoulder(44, 52),
	}
}

// supportTerms строит набор термов выхода на универсуме [0, 100] (РПЗ таблица 20).
func supportTerms() map[string]MembershipFunc {
	return map[string]MembershipFunc{
		TermVeryLow:  leftShoulder(10, 30),
		TermSupLow:   triangle(10, 30, 50),
		TermSupMid:   triangle(30, 50, 70),
		TermSupHigh:  triangle(50, 70, 90),
		TermVeryHigh: rightShoulder(70, 90),
	}
}
