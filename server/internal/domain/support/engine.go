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

// defaultRules инициализирует базу нечётких правил. Сюда включены все правила,
// явно представленные в РПЗ: задокументированные примеры из таблицы 21 (правила
// 1, 5, 27, 29) и правила разобранного примера §1.8 (таблица 26: правила 2, 10,
// 11, 34, 49, 52, 55, 59), восстановленные по их консеквентам и степеням
// активации. Этого набора достаточно, чтобы воспроизвести контрольный расчёт
// §1.8 (формула 12, ≈61.82). Остальные правила полной базы из 59 штук —
// предметные данные из психологической литературы; они подключаются сюда как
// данные, без изменения движка.
//
// Примечание: там, где степень активации в таблице 26 совпадает у нескольких
// термов (напр. Д=Низкая и Н=Высокий обе равны 0.30), точный состав антецедента
// по РПЗ однозначно не восстанавливается; выбран психологически осмысленный
// вариант, согласованный с обоснованиями таблицы 21.
func defaultRules() []Rule {
	return []Rule{
		// --- Задокументированные примеры (РПЗ таблица 21) ---
		{ // 1: Н=Высокий ∧ Э=Низкая ∧ ЭС=Очень плохое → Очень высокая
			Antecedent: []Clause{
				{{VarNeuroticism, TermHigh}},
				{{VarExtraversion, TermLow}},
				{{VarEmotionalState, TermVeryBad}},
			},
			Consequent: TermVeryHigh,
		},
		{ // 5: Н=Высокий ∧ ДС=Низкая ∧ ЭС=Плохое → Очень высокая
			Antecedent: []Clause{
				{{VarNeuroticism, TermHigh}},
				{{VarConscientiousness, TermLow}},
				{{VarEmotionalState, TermBad}},
			},
			Consequent: TermVeryHigh,
		},
		{ // 27: ДС=Низкая ∧ ЭС=Очень плохое → Очень высокая
			Antecedent: []Clause{
				{{VarConscientiousness, TermLow}},
				{{VarEmotionalState, TermVeryBad}},
			},
			Consequent: TermVeryHigh,
		},
		{ // 29: ДС=Высокая ∧ (Н=Низкий ∨ Н=Средний) ∧ ЭС=Плохое → Средняя
			Antecedent: []Clause{
				{{VarConscientiousness, TermHigh}},
				{{VarNeuroticism, TermLow}, {VarNeuroticism, TermMid}},
				{{VarEmotionalState, TermBad}},
			},
			Consequent: TermSupMid,
		},
		// --- Правила разобранного примера §1.8 (РПЗ таблица 26) ---
		{ // 2: Н=Высокий ∧ Д=Низкая ∧ ЭС=Плохое → Очень высокая
			Antecedent: []Clause{
				{{VarNeuroticism, TermHigh}},
				{{VarAgreeableness, TermLow}},
				{{VarEmotionalState, TermBad}},
			},
			Consequent: TermVeryHigh,
		},
		{ // 10: Н=Высокий ∧ Э=Высокий ∧ ЭС=Плохое → Высокая
			Antecedent: []Clause{
				{{VarNeuroticism, TermHigh}},
				{{VarExtraversion, TermHigh}},
				{{VarEmotionalState, TermBad}},
			},
			Consequent: TermSupHigh,
		},
		{ // 11: Н=Высокий ∧ О=Высокая ∧ ЭС=Плохое → Высокая
			Antecedent: []Clause{
				{{VarNeuroticism, TermHigh}},
				{{VarOpenness, TermHigh}},
				{{VarEmotionalState, TermBad}},
			},
			Consequent: TermSupHigh,
		},
		{ // 34: Н=Высокий ∧ ЭС=Плохое → Высокая
			Antecedent: []Clause{
				{{VarNeuroticism, TermHigh}},
				{{VarEmotionalState, TermBad}},
			},
			Consequent: TermSupHigh,
		},
		{ // 49: Д=Низкая ∧ ЭС=Плохое → Высокая
			Antecedent: []Clause{
				{{VarAgreeableness, TermLow}},
				{{VarEmotionalState, TermBad}},
			},
			Consequent: TermSupHigh,
		},
		{ // 52: Н=Высокий ∧ (Э=Низкий ∨ ДС=Высокая) ∧ ЭС=Плохое → Высокая
			Antecedent: []Clause{
				{{VarNeuroticism, TermHigh}},
				{{VarExtraversion, TermLow}, {VarConscientiousness, TermHigh}},
				{{VarEmotionalState, TermBad}},
			},
			Consequent: TermSupHigh,
		},
		{ // 55: Н=Средний ∧ ЭС=Плохое → Средняя
			Antecedent: []Clause{
				{{VarNeuroticism, TermMid}},
				{{VarEmotionalState, TermBad}},
			},
			Consequent: TermSupMid,
		},
		{ // 59: Э=Высокий ∧ Д=Средняя ∧ ДС=Высокая ∧ Н=Средний ∧ О=Средняя ∧ ЭС=Плохое → Средняя
			Antecedent: []Clause{
				{{VarExtraversion, TermHigh}},
				{{VarAgreeableness, TermMid}},
				{{VarConscientiousness, TermHigh}},
				{{VarNeuroticism, TermMid}},
				{{VarOpenness, TermMid}},
				{{VarEmotionalState, TermBad}},
			},
			Consequent: TermSupMid,
		},
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
