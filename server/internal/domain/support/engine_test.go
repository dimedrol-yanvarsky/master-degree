package support

import (
	"math"
	"testing"
)

func approx(t *testing.T, name string, got, want, tol float64) {
	t.Helper()
	if math.Abs(got-want) > tol {
		t.Errorf("%s = %.4f, want %.4f (±%.4f)", name, got, want, tol)
	}
}

// TestMembershipMatchesReference воспроизводит таблицу фаззификации разобранного
// примера РПЗ §1.8.1 (таблицы 23–24).
func TestMembershipMatchesReference(t *testing.T) {
	e := NewEngine()

	cases := []struct {
		variable string
		term     string
		x        float64
		want     float64
	}{
		{VarExtraversion, TermMid, 3.45, 0.71},
		{VarExtraversion, TermHigh, 3.45, 0.29},
		{VarAgreeableness, TermLow, 3.22, 0.30},
		{VarAgreeableness, TermMid, 3.22, 0.70},
		{VarConscientiousness, TermMid, 3.52, 0.91},
		{VarConscientiousness, TermHigh, 3.52, 0.09},
		{VarNeuroticism, TermMid, 3.09, 0.70},
		{VarNeuroticism, TermHigh, 3.09, 0.30},
		{VarOpenness, TermMid, 3.83, 0.65},
		{VarOpenness, TermHigh, 3.83, 0.35},
		{VarEmotionalState, TermBad, 44, 1.00},
		{VarEmotionalState, TermVeryBad, 44, 0.00},
		{VarEmotionalState, TermNormal, 44, 0.00},
	}

	for _, c := range cases {
		mf := e.Membership(c.variable, c.term)
		if mf == nil {
			t.Fatalf("no membership function for %s/%s", c.variable, c.term)
		}
		approx(t, c.variable+"/"+c.term, mf(c.x), c.want, 0.01)
	}
}

// TestDefuzzificationMatchesReference воспроизводит агрегацию и центр тяжести
// разобранного примера (РПЗ формула 8 → формула 12): при силах активации
// средняя=0.70, высокая=0.304, очень высокая=0.30 центр тяжести ≈61.82.
func TestDefuzzificationMatchesReference(t *testing.T) {
	e := NewEngine()

	aggregated := e.aggregate(map[string]float64{
		TermSupMid:   0.70,
		TermSupHigh:  0.304,
		TermVeryHigh: 0.30,
	})

	score := centroid(aggregated, outputLow, outputHigh, defuzzStep)
	approx(t, "support need (centroid)", score, 61.82, 0.5)

	if got := dominantTerm(map[string]float64{
		TermSupMid:   e.OutputMembership(TermSupMid)(score),
		TermSupHigh:  e.OutputMembership(TermSupHigh)(score),
		TermVeryHigh: 0,
	}); got != TermSupHigh {
		t.Errorf("dominant term = %q, want %q", got, TermSupHigh)
	}
}

// TestInferActivatesRules проверяет, что профиль высокого риска активирует
// правила «очень высокая» и даёт ненулевой балл потребности в поддержке.
func TestInferActivatesRules(t *testing.T) {
	e := NewEngine()

	result := e.Infer(map[string]float64{
		VarNeuroticism:       4.5, // высокий
		VarConscientiousness: 1.5, // низкая
		VarEmotionalState:    60,  // очень плохое
	})

	if result.Activations[TermVeryHigh] <= 0 {
		t.Fatalf("expected the 'very high' term to fire, got activations %v", result.Activations)
	}
	if result.Score <= 0 {
		t.Errorf("expected a positive support-need score, got %.4f", result.Score)
	}
}

// TestInferReproducesWorkedExample прогоняет полный конвейер вывода на входном
// наборе разобранного примера РПЗ §1.8 (профиль 2 из таблицы 22 + ЭС=Плохое) и
// проверяет, что движок воспроизводит контрольный результат: степень
// необходимости в поддержке ≈61.82 (РПЗ формула 12) с доминирующим термом
// «высокая» и аккумулированными активациями из таблицы 27.
func TestInferReproducesWorkedExample(t *testing.T) {
	e := NewEngine()

	result := e.Infer(map[string]float64{
		VarExtraversion:      3.45,
		VarAgreeableness:     3.22,
		VarConscientiousness: 3.52,
		VarNeuroticism:       3.09,
		VarOpenness:          3.83,
		VarEmotionalState:    44,
	})

	approx(t, "степень необходимости в поддержке", result.Score, 61.82, 0.5)

	if result.Term != TermSupHigh {
		t.Errorf("доминирующий терм = %q, ожидался %q", result.Term, TermSupHigh)
	}

	// Аккумулированные силы активации по выходным термам (РПЗ таблица 27;
	// «высокая» здесь равна 0.30 — в РПЗ приведено 0.304).
	wantActivations := map[string]float64{
		TermSupMid:   0.70,
		TermSupHigh:  0.30,
		TermVeryHigh: 0.30,
	}
	for term, want := range wantActivations {
		if got := result.Activations[term]; math.Abs(got-want) > 0.01 {
			t.Errorf("активация %q = %.3f, ожидалась %.3f", term, got, want)
		}
	}
}
