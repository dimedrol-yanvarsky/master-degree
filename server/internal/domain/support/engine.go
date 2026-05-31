package support

import "math"

const (
	outputLow  = 0.0
	outputHigh = 100.0
	// defuzzStep — шаг дискретизации интеграла центра тяжести
	// (метод прямоугольников, РПЗ §1.8.3 берёт 0.01).
	defuzzStep = 0.01
)

// Condition — атом антецедента: «Variable есть Term».
type Condition struct {
	Variable string
	Term     string
}

// Clause — дизъюнкция (ИЛИ) условий, напр. (Н=Низкий ∨ Н=Средний).
type Clause []Condition

// Rule — правило «ЕСЛИ <антецедент> ТО потребность в поддержке = <Consequent>»,
// где антецедент — конъюнкция (И) дизъюнктов.
type Rule struct {
	Antecedent []Clause
	Consequent string
}

// Result — итог одного прохода вывода.
type Result struct {
	// Score — чёткое значение потребности в поддержке по шкале [0, 100].
	Score float64
	// Term — доминирующий терм выхода в точке Score.
	Term string
	// Activations — сила активации по каждому терму выхода после аккумуляции.
	Activations map[string]float64
	// Memberships — принадлежность Score каждому терму выхода.
	Memberships map[string]float64
}

// Engine — система нечёткого вывода Мамдани: входные переменные, выходная
// переменная и база правил.
type Engine struct {
	inputs map[string]map[string]MembershipFunc
	output map[string]MembershipFunc
	rules  []Rule
}

// NewEngine собирает движок с лингвистическими переменными и функциями
// принадлежности из РПЗ §1.6 и базой правил. База инициализируется
// задокументированными примерами правил (РПЗ таблица 21); полный набор из
// 59 правил (§1.7) — предметные данные, подключаемые здесь без изменения движка.
func NewEngine() *Engine {
	return &Engine{
		inputs: map[string]map[string]MembershipFunc{
			VarExtraversion:      traitTerms(3.22, 0.78),
			VarAgreeableness:     traitTerms(3.43, 0.69),
			VarConscientiousness: traitTerms(3.45, 0.74),
			VarNeuroticism:       traitTerms(2.85, 0.80),
			VarOpenness:          traitTerms(3.60, 0.65),
			VarEmotionalState:    emotionTerms(),
		},
		output: supportTerms(),
		rules:  defaultRules(),
	}
}

// NewEngineWithRules собирает движок с произвольной базой правил (используется
// тестами и при подключении полной базы знаний).
func NewEngineWithRules(rules []Rule) *Engine {
	engine := NewEngine()
	engine.rules = rules
	return engine
}

// Membership возвращает функцию принадлежности терма входной переменной или nil.
func (e *Engine) Membership(variable, term string) MembershipFunc {
	terms := e.inputs[variable]
	if terms == nil {
		return nil
	}
	return terms[term]
}

// OutputMembership возвращает функцию принадлежности терма выхода или nil.
func (e *Engine) OutputMembership(term string) MembershipFunc {
	return e.output[term]
}

// Infer выполняет полный конвейер Мамдани для чётких входов (переменная -> значение).
func (e *Engine) Infer(inputs map[string]float64) Result {
	activations := make(map[string]float64)
	for _, rule := range e.rules {
		strength := e.ruleStrength(rule, inputs)
		if strength <= 0 {
			continue
		}
		// Аккумуляция: берём максимальную силу по каждому терму выхода.
		if strength > activations[rule.Consequent] {
			activations[rule.Consequent] = strength
		}
	}

	aggregated := e.aggregate(activations)
	score := centroid(aggregated, outputLow, outputHigh, defuzzStep)

	memberships := make(map[string]float64, len(e.output))
	for term, mf := range e.output {
		memberships[term] = mf(score)
	}

	return Result{
		Score:       score,
		Term:        dominantTerm(memberships),
		Activations: activations,
		Memberships: memberships,
	}
}

// ruleStrength применяет t-норму (min по дизъюнктам) и s-конорму (max внутри
// дизъюнкта), как в РПЗ таблице 25.
func (e *Engine) ruleStrength(rule Rule, inputs map[string]float64) float64 {
	strength := 1.0
	for _, clause := range rule.Antecedent {
		clauseDegree := 0.0
		for _, cond := range clause {
			mf := e.Membership(cond.Variable, cond.Term)
			if mf == nil {
				continue
			}
			if degree := mf(inputs[cond.Variable]); degree > clauseDegree {
				clauseDegree = degree
			}
		}
		if clauseDegree < strength {
			strength = clauseDegree
		}
	}
	return strength
}

// aggregate строит результирующее нечёткое множество μ_Σ(y): срезает каждый
// активированный терм выхода по силе активации (min) и берёт max по термам.
func (e *Engine) aggregate(activations map[string]float64) MembershipFunc {
	return func(y float64) float64 {
		best := 0.0
		for term, alpha := range activations {
			mf := e.output[term]
			if mf == nil {
				continue
			}
			if clipped := math.Min(mf(y), alpha); clipped > best {
				best = clipped
			}
		}
		return best
	}
}

// centroid вычисляет центр тяжести f на [lo, hi] методом прямоугольников
// (РПЗ формула 9).
func centroid(f MembershipFunc, lo, hi, step float64) float64 {
	var numerator, denominator float64
	for y := lo; y <= hi+step/2; y += step {
		mu := f(y)
		numerator += y * mu
		denominator += mu
	}
	if denominator == 0 {
		return 0
	}
	return numerator / denominator
}

// dominantTerm возвращает терм выхода с наибольшей принадлежностью.
func dominantTerm(memberships map[string]float64) string {
	best := ""
	bestValue := -1.0
	for _, term := range outputTermOrder {
		if value := memberships[term]; value > bestValue {
			bestValue = value
			best = term
		}
	}
	return best
}

// outputTermOrder фиксирует порядок термов выхода (от малой к очень высокой
// потребности) и детерминированно разрешает равенства.
var outputTermOrder = []string{TermVeryLow, TermSupLow, TermSupMid, TermSupHigh, TermVeryHigh}

// OutputTermOrder возвращает термы выхода в порядке возрастания потребности
// в поддержке.
func OutputTermOrder() []string {
	ordered := make([]string, len(outputTermOrder))
	copy(ordered, outputTermOrder)
	return ordered
}

func cond(variable, term string) Condition {
	return Condition{Variable: variable, Term: term}
}

func is(variable, term string) Clause {
	return Clause{cond(variable, term)}
}

func anyOf(conditions ...Condition) Clause {
	return Clause(conditions)
}

func rule(consequent string, antecedent ...Clause) Rule {
	return Rule{Antecedent: antecedent, Consequent: consequent}
}

// defaultRules инициализирует полную активную базу нечётких правил из таблицы
// final_rules_status_table.docx. Правило 60 из таблицы исключено, потому что в
// документе оно помечено как удалённое и поглощённое правилом 55.
func defaultRules() []Rule {
	return []Rule{
		// 1. ЕСЛИ Нейротизм = Высокий И Экстраверсия = Низкая И Эмоциональное состояние = Очень плохое, ТО Степень поддержки = Очень высокая
		rule(TermVeryHigh,
			is(VarNeuroticism, TermHigh),
			is(VarExtraversion, TermLow),
			is(VarEmotionalState, TermVeryBad),
		),
		// 2. ЕСЛИ Нейротизм = Высокий И Доброжелательность = Низкая И Эмоциональное состояние = Плохое, ТО Степень поддержки = Очень высокая
		rule(TermVeryHigh,
			is(VarNeuroticism, TermHigh),
			is(VarAgreeableness, TermLow),
			is(VarEmotionalState, TermBad),
		),
		// 3. ЕСЛИ Нейротизм = Высокий И Открытость к опыту = Низкая И Эмоциональное состояние = Плохое, ТО Степень поддержки = Высокая
		rule(TermSupHigh,
			is(VarNeuroticism, TermHigh),
			is(VarOpenness, TermLow),
			is(VarEmotionalState, TermBad),
		),
		// 4. ЕСЛИ Нейротизм = Высокий И Экстраверсия = Низкая И Доброжелательность = Низкая И Эмоциональное состояние = Нормальное, ТО Степень поддержки = Средняя
		rule(TermSupMid,
			is(VarNeuroticism, TermHigh),
			is(VarExtraversion, TermLow),
			is(VarAgreeableness, TermLow),
			is(VarEmotionalState, TermNormal),
		),
		// 5. ЕСЛИ Нейротизм = Высокий И Добросовестность = Низкая И Эмоциональное состояние = Плохое, ТО Степень поддержки = Очень высокая
		rule(TermVeryHigh,
			is(VarNeuroticism, TermHigh),
			is(VarConscientiousness, TermLow),
			is(VarEmotionalState, TermBad),
		),
		// 6. ЕСЛИ Нейротизм = Высокий И Эмоциональное состояние = Нормальное, ТО Степень поддержки = Средняя
		rule(TermSupMid,
			is(VarNeuroticism, TermHigh),
			is(VarEmotionalState, TermNormal),
		),
		// 7. ЕСЛИ Нейротизм = Высокий И Эмоциональное состояние = Хорошее, ТО Степень поддержки = Малая
		rule(TermSupLow,
			is(VarNeuroticism, TermHigh),
			is(VarEmotionalState, TermGood),
		),
		// 8. ЕСЛИ Нейротизм = Высокий И Эмоциональное состояние = Отличное, ТО Степень поддержки = Малая
		rule(TermSupLow,
			is(VarNeuroticism, TermHigh),
			is(VarEmotionalState, TermExcellent),
		),
		// 9. ЕСЛИ Нейротизм = Высокий И Доброжелательность = Высокая И Эмоциональное состояние = Плохое, ТО Степень поддержки = Высокая
		rule(TermSupHigh,
			is(VarNeuroticism, TermHigh),
			is(VarAgreeableness, TermHigh),
			is(VarEmotionalState, TermBad),
		),
		// 10. ЕСЛИ Нейротизм = Высокий И Экстраверсия = Высокая И Эмоциональное состояние = Плохое, ТО Степень поддержки = Высокая
		rule(TermSupHigh,
			is(VarNeuroticism, TermHigh),
			is(VarExtraversion, TermHigh),
			is(VarEmotionalState, TermBad),
		),
		// 11. ЕСЛИ Нейротизм = Высокий И Открытость к опыту = Высокая И Эмоциональное состояние = Плохое, ТО Степень поддержки = Высокая
		rule(TermSupHigh,
			is(VarNeuroticism, TermHigh),
			is(VarOpenness, TermHigh),
			is(VarEmotionalState, TermBad),
		),
		// 12. ЕСЛИ Нейротизм = Высокий И Экстраверсия = Средняя И Эмоциональное состояние = Очень плохое, ТО Степень поддержки = Очень высокая
		rule(TermVeryHigh,
			is(VarNeuroticism, TermHigh),
			is(VarExtraversion, TermMid),
			is(VarEmotionalState, TermVeryBad),
		),
		// 13. ЕСЛИ Нейротизм = Низкий И Эмоциональное состояние = Очень плохое, ТО Степень поддержки = Высокая
		rule(TermSupHigh,
			is(VarNeuroticism, TermLow),
			is(VarEmotionalState, TermVeryBad),
		),
		// 14. ЕСЛИ Нейротизм = Низкий И Экстраверсия = Высокая И Эмоциональное состояние = Отличное, ТО Степень поддержки = Очень малая
		rule(TermVeryLow,
			is(VarNeuroticism, TermLow),
			is(VarExtraversion, TermHigh),
			is(VarEmotionalState, TermExcellent),
		),
		// 15. ЕСЛИ Нейротизм = Низкий И Эмоциональное состояние = Плохое, ТО Степень поддержки = Средняя
		rule(TermSupMid,
			is(VarNeuroticism, TermLow),
			is(VarEmotionalState, TermBad),
		),
		// 16. ЕСЛИ Нейротизм = Низкий И Добросовестность = Высокая И Эмоциональное состояние = Нормальное, ТО Степень поддержки = Очень малая
		rule(TermVeryLow,
			is(VarNeuroticism, TermLow),
			is(VarConscientiousness, TermHigh),
			is(VarEmotionalState, TermNormal),
		),
		// 17. ЕСЛИ Нейротизм = Низкий И Экстраверсия = Низкая И Эмоциональное состояние = Очень плохое, ТО Степень поддержки = Высокая
		rule(TermSupHigh,
			is(VarNeuroticism, TermLow),
			is(VarExtraversion, TermLow),
			is(VarEmotionalState, TermVeryBad),
		),
		// 18. ЕСЛИ Нейротизм = Низкий И Эмоциональное состояние = Нормальное, ТО Степень поддержки = Малая
		rule(TermSupLow,
			is(VarNeuroticism, TermLow),
			is(VarEmotionalState, TermNormal),
		),
		// 19. ЕСЛИ Нейротизм = Низкий И (Эмоциональное состояние = Хорошее ИЛИ Эмоциональное состояние = Отличное), ТО Степень поддержки = Очень малая
		rule(TermVeryLow,
			is(VarNeuroticism, TermLow),
			anyOf(cond(VarEmotionalState, TermGood), cond(VarEmotionalState, TermExcellent)),
		),
		// 20. ЕСЛИ Экстраверсия = Низкая И Эмоциональное состояние = Плохое, ТО Степень поддержки = Высокая
		rule(TermSupHigh,
			is(VarExtraversion, TermLow),
			is(VarEmotionalState, TermBad),
		),
		// 21. ЕСЛИ Экстраверсия = Низкая И Эмоциональное состояние = Нормальное, ТО Степень поддержки = Малая
		rule(TermSupLow,
			is(VarExtraversion, TermLow),
			is(VarEmotionalState, TermNormal),
		),
		// 22. ЕСЛИ Экстраверсия = Низкая И Добросовестность = Низкая И Эмоциональное состояние = Плохое, ТО Степень поддержки = Очень высокая
		rule(TermVeryHigh,
			is(VarExtraversion, TermLow),
			is(VarConscientiousness, TermLow),
			is(VarEmotionalState, TermBad),
		),
		// 23. ЕСЛИ Экстраверсия = Высокая И (Нейротизм = Низкий ИЛИ Нейротизм = Средний) И Эмоциональное состояние = Нормальное, ТО Степень поддержки = Малая
		rule(TermSupLow,
			is(VarExtraversion, TermHigh),
			anyOf(cond(VarNeuroticism, TermLow), cond(VarNeuroticism, TermMid)),
			is(VarEmotionalState, TermNormal),
		),
		// 24. ЕСЛИ Экстраверсия = Высокая И (Нейротизм = Низкий ИЛИ Нейротизм = Средний) И Эмоциональное состояние = Очень плохое, ТО Степень поддержки = Высокая
		rule(TermSupHigh,
			is(VarExtraversion, TermHigh),
			anyOf(cond(VarNeuroticism, TermLow), cond(VarNeuroticism, TermMid)),
			is(VarEmotionalState, TermVeryBad),
		),
		// 25. ЕСЛИ Экстраверсия = Средняя И Эмоциональное состояние = Очень плохое, ТО Степень поддержки = Высокая
		rule(TermSupHigh,
			is(VarExtraversion, TermMid),
			is(VarEmotionalState, TermVeryBad),
		),
		// 26. ЕСЛИ Экстраверсия = Высокая И (Нейротизм = Низкий ИЛИ Нейротизм = Средний) И Эмоциональное состояние = Хорошее, ТО Степень поддержки = Очень малая
		rule(TermVeryLow,
			is(VarExtraversion, TermHigh),
			anyOf(cond(VarNeuroticism, TermLow), cond(VarNeuroticism, TermMid)),
			is(VarEmotionalState, TermGood),
		),
		// 27. ЕСЛИ Добросовестность = Низкая И Эмоциональное состояние = Очень плохое, ТО Степень поддержки = Очень высокая
		rule(TermVeryHigh,
			is(VarConscientiousness, TermLow),
			is(VarEmotionalState, TermVeryBad),
		),
		// 28. ЕСЛИ Добросовестность = Низкая И Эмоциональное состояние = Плохое, ТО Степень поддержки = Высокая
		rule(TermSupHigh,
			is(VarConscientiousness, TermLow),
			is(VarEmotionalState, TermBad),
		),
		// 29. ЕСЛИ Добросовестность = Высокая И (Нейротизм = Низкий ИЛИ Нейротизм = Средний) И Эмоциональное состояние = Плохое, ТО Степень поддержки = Средняя
		rule(TermSupMid,
			is(VarConscientiousness, TermHigh),
			anyOf(cond(VarNeuroticism, TermLow), cond(VarNeuroticism, TermMid)),
			is(VarEmotionalState, TermBad),
		),
		// 30. ЕСЛИ Добросовестность = Высокая И Эмоциональное состояние = Очень плохое, ТО Степень поддержки = Высокая
		rule(TermSupHigh,
			is(VarConscientiousness, TermHigh),
			is(VarEmotionalState, TermVeryBad),
		),
		// 31. ЕСЛИ Добросовестность = Средняя И Эмоциональное состояние = Очень плохое, ТО Степень поддержки = Высокая
		rule(TermSupHigh,
			is(VarConscientiousness, TermMid),
			is(VarEmotionalState, TermVeryBad),
		),
		// 32. ЕСЛИ Добросовестность = Высокая И (Нейротизм = Низкий ИЛИ Нейротизм = Средний) И Эмоциональное состояние = Нормальное, ТО Степень поддержки = Малая
		rule(TermSupLow,
			is(VarConscientiousness, TermHigh),
			anyOf(cond(VarNeuroticism, TermLow), cond(VarNeuroticism, TermMid)),
			is(VarEmotionalState, TermNormal),
		),
		// 33. ЕСЛИ Доброжелательность = Низкая И Эмоциональное состояние = Очень плохое, ТО Степень поддержки = Очень высокая
		rule(TermVeryHigh,
			is(VarAgreeableness, TermLow),
			is(VarEmotionalState, TermVeryBad),
		),
		// 34. ЕСЛИ Доброжелательность = Низкая И Эмоциональное состояние = Плохое, ТО Степень поддержки = Высокая
		rule(TermSupHigh,
			is(VarAgreeableness, TermLow),
			is(VarEmotionalState, TermBad),
		),
		// 35. ЕСЛИ Доброжелательность = Высокая И (Нейротизм = Низкий ИЛИ Нейротизм = Средний) И Эмоциональное состояние = Плохое, ТО Степень поддержки = Средняя
		rule(TermSupMid,
			is(VarAgreeableness, TermHigh),
			anyOf(cond(VarNeuroticism, TermLow), cond(VarNeuroticism, TermMid)),
			is(VarEmotionalState, TermBad),
		),
		// 36. ЕСЛИ Доброжелательность = Высокая И Эмоциональное состояние = Очень плохое, ТО Степень поддержки = Высокая
		rule(TermSupHigh,
			is(VarAgreeableness, TermHigh),
			is(VarEmotionalState, TermVeryBad),
		),
		// 37. ЕСЛИ Доброжелательность = Высокая И Добросовестность = Высокая И Экстраверсия = Высокая И (Нейротизм = Низкий ИЛИ Нейротизм = Средний) И (Открытость к опыту = Средняя ИЛИ Открытость к опыту = Высокая) И Эмоциональное состояние = Нормальное, ТО Степень поддержки = Очень малая
		rule(TermVeryLow,
			is(VarAgreeableness, TermHigh),
			is(VarConscientiousness, TermHigh),
			is(VarExtraversion, TermHigh),
			anyOf(cond(VarNeuroticism, TermLow), cond(VarNeuroticism, TermMid)),
			anyOf(cond(VarOpenness, TermMid), cond(VarOpenness, TermHigh)),
			is(VarEmotionalState, TermNormal),
		),
		// 38. ЕСЛИ Доброжелательность = Низкая И Добросовестность = Низкая И Эмоциональное состояние = Плохое, ТО Степень поддержки = Очень высокая
		rule(TermVeryHigh,
			is(VarAgreeableness, TermLow),
			is(VarConscientiousness, TermLow),
			is(VarEmotionalState, TermBad),
		),
		// 39. ЕСЛИ Доброжелательность = Средняя И Эмоциональное состояние = Очень плохое, ТО Степень поддержки = Высокая
		rule(TermSupHigh,
			is(VarAgreeableness, TermMid),
			is(VarEmotionalState, TermVeryBad),
		),
		// 40. ЕСЛИ Открытость к опыту = Высокая И Нейротизм = Средний И Эмоциональное состояние = Нормальное, ТО Степень поддержки = Малая
		rule(TermSupLow,
			is(VarOpenness, TermHigh),
			is(VarNeuroticism, TermMid),
			is(VarEmotionalState, TermNormal),
		),
		// 41. ЕСЛИ Открытость к опыту = Низкая И Экстраверсия = Низкая И Эмоциональное состояние = Плохое, ТО Степень поддержки = Высокая
		rule(TermSupHigh,
			is(VarOpenness, TermLow),
			is(VarExtraversion, TermLow),
			is(VarEmotionalState, TermBad),
		),
		// 42. ЕСЛИ Открытость к опыту = Низкая И Эмоциональное состояние = Очень плохое, ТО Степень поддержки = Высокая
		rule(TermSupHigh,
			is(VarOpenness, TermLow),
			is(VarEmotionalState, TermVeryBad),
		),
		// 43. ЕСЛИ Открытость к опыту = Высокая И (Нейротизм = Низкий ИЛИ Нейротизм = Средний) И Эмоциональное состояние = Очень плохое, ТО Степень поддержки = Высокая
		rule(TermSupHigh,
			is(VarOpenness, TermHigh),
			anyOf(cond(VarNeuroticism, TermLow), cond(VarNeuroticism, TermMid)),
			is(VarEmotionalState, TermVeryBad),
		),
		// 44. ЕСЛИ Нейротизм = Высокий И Открытость к опыту = Низкая И Эмоциональное состояние = Нормальное, ТО Степень поддержки = Средняя
		rule(TermSupMid,
			is(VarNeuroticism, TermHigh),
			is(VarOpenness, TermLow),
			is(VarEmotionalState, TermNormal),
		),
		// 45. ЕСЛИ Нейротизм = Высокий И Эмоциональное состояние = Очень плохое, ТО Степень поддержки = Очень высокая
		rule(TermVeryHigh,
			is(VarNeuroticism, TermHigh),
			is(VarEmotionalState, TermVeryBad),
		),
		// 46. ЕСЛИ Нейротизм = Высокий И (Добросовестность = Низкая ИЛИ Доброжелательность = Низкая) И Эмоциональное состояние = Нормальное, ТО Степень поддержки = Средняя
		rule(TermSupMid,
			is(VarNeuroticism, TermHigh),
			anyOf(cond(VarConscientiousness, TermLow), cond(VarAgreeableness, TermLow)),
			is(VarEmotionalState, TermNormal),
		),
		// 47. ЕСЛИ Экстраверсия = Низкая И (Нейротизм = Высокий ИЛИ Добросовестность = Низкая) И Эмоциональное состояние = Плохое, ТО Степень поддержки = Очень высокая
		rule(TermVeryHigh,
			is(VarExtraversion, TermLow),
			anyOf(cond(VarNeuroticism, TermHigh), cond(VarConscientiousness, TermLow)),
			is(VarEmotionalState, TermBad),
		),
		// 48. ЕСЛИ Экстраверсия = Низкая И Доброжелательность = Низкая И Эмоциональное состояние = Очень плохое, ТО Степень поддержки = Очень высокая
		rule(TermVeryHigh,
			is(VarExtraversion, TermLow),
			is(VarAgreeableness, TermLow),
			is(VarEmotionalState, TermVeryBad),
		),
		// 49. ЕСЛИ Нейротизм = Высокий И Эмоциональное состояние = Плохое, ТО Степень поддержки = Высокая
		rule(TermSupHigh,
			is(VarNeuroticism, TermHigh),
			is(VarEmotionalState, TermBad),
		),
		// 50. ЕСЛИ (Добросовестность = Низкая ИЛИ Доброжелательность = Низкая) И Эмоциональное состояние = Очень плохое, ТО Степень поддержки = Очень высокая
		rule(TermVeryHigh,
			anyOf(cond(VarConscientiousness, TermLow), cond(VarAgreeableness, TermLow)),
			is(VarEmotionalState, TermVeryBad),
		),
		// 51. ЕСЛИ Нейротизм = Высокий И Добросовестность = Низкая И Эмоциональное состояние = Нормальное, ТО Степень поддержки = Средняя
		rule(TermSupMid,
			is(VarNeuroticism, TermHigh),
			is(VarConscientiousness, TermLow),
			is(VarEmotionalState, TermNormal),
		),
		// 52. ЕСЛИ Нейротизм = Высокий И (Доброжелательность = Высокая ИЛИ Добросовестность = Высокая) И Эмоциональное состояние = Плохое, ТО Степень поддержки = Высокая
		rule(TermSupHigh,
			is(VarNeuroticism, TermHigh),
			anyOf(cond(VarAgreeableness, TermHigh), cond(VarConscientiousness, TermHigh)),
			is(VarEmotionalState, TermBad),
		),
		// 53. ЕСЛИ (Доброжелательность = Высокая ИЛИ Экстраверсия = Высокая) И (Нейротизм = Низкий ИЛИ Нейротизм = Средний) И Эмоциональное состояние = Нормальное, ТО Степень поддержки = Малая
		rule(TermSupLow,
			anyOf(cond(VarAgreeableness, TermHigh), cond(VarExtraversion, TermHigh)),
			anyOf(cond(VarNeuroticism, TermLow), cond(VarNeuroticism, TermMid)),
			is(VarEmotionalState, TermNormal),
		),
		// 54. ЕСЛИ Нейротизм = Средний И Эмоциональное состояние = Нормальное, ТО Степень поддержки = Средняя
		rule(TermSupMid,
			is(VarNeuroticism, TermMid),
			is(VarEmotionalState, TermNormal),
		),
		// 55. ЕСЛИ Нейротизм = Средний И Эмоциональное состояние = Плохое, ТО Степень поддержки = Средняя
		rule(TermSupMid,
			is(VarNeuroticism, TermMid),
			is(VarEmotionalState, TermBad),
		),
		// 56. ЕСЛИ Нейротизм = Средний И Эмоциональное состояние = Очень плохое, ТО Степень поддержки = Высокая
		rule(TermSupHigh,
			is(VarNeuroticism, TermMid),
			is(VarEmotionalState, TermVeryBad),
		),
		// 57. ЕСЛИ Нейротизм = Средний И Эмоциональное состояние = Хорошее, ТО Степень поддержки = Малая
		rule(TermSupLow,
			is(VarNeuroticism, TermMid),
			is(VarEmotionalState, TermGood),
		),
		// 58. ЕСЛИ Нейротизм = Средний И Эмоциональное состояние = Отличное, ТО Степень поддержки = Очень малая
		rule(TermVeryLow,
			is(VarNeuroticism, TermMid),
			is(VarEmotionalState, TermExcellent),
		),
		// 59. ЕСЛИ Нейротизм = Средний И Добросовестность = Высокая И Экстраверсия = Высокая И (Доброжелательность = Средняя ИЛИ Доброжелательность = Высокая) И (Открытость к опыту = Средняя ИЛИ Открытость к опыту = Высокая) И Эмоциональное состояние = Плохое, ТО Степень поддержки = Средняя
		rule(TermSupMid,
			is(VarNeuroticism, TermMid),
			is(VarConscientiousness, TermHigh),
			is(VarExtraversion, TermHigh),
			anyOf(cond(VarAgreeableness, TermMid), cond(VarAgreeableness, TermHigh)),
			anyOf(cond(VarOpenness, TermMid), cond(VarOpenness, TermHigh)),
			is(VarEmotionalState, TermBad),
		),
	}
}

// outputLabels сопоставляет ключи термов выхода их русским подписям (РПЗ таблица 20).
var outputLabels = map[string]string{
	TermVeryLow:  "очень малая",
	TermSupLow:   "малая",
	TermSupMid:   "средняя",
	TermSupHigh:  "высокая",
	TermVeryHigh: "очень высокая",
}

// Label возвращает русскую подпись для ключа терма выхода.
func Label(term string) string {
	if label, ok := outputLabels[term]; ok {
		return label
	}
	return term
}
