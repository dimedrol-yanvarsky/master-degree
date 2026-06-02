// Пакет support — use case приложения, вычисляющий степень потребности в
// психологической поддержке. Оркеструет доменный нечёткий движок, держа
// транспорт и хранилище вне бизнес-логики.
package support

import (
	"context"
	"fmt"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	domainsupport "github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/support"
)

// Допустимые универсумы (РПЗ §1.6): факторы BFI-2 на [1, 5], эмоциональное
// состояние BDS на [16, 64].
const (
	traitMin = 1.0
	traitMax = 5.0
	stateMin = 16.0
	stateMax = 64.0
)

// Input — набор чётких показателей для оценки потребности в поддержке.
type Input struct {
	Extraversion      float64
	Agreeableness     float64
	Conscientiousness float64
	Neuroticism       float64
	Openness          float64
	EmotionalState    float64
}

// TermMembership — принадлежность результата одному качественному терму выхода.
type TermMembership struct {
	Term       string
	Membership float64
}

// Output — результат use case: чёткий балл, его качественный уровень и
// принадлежности по термам, объясняющие балл (интерпретируемость).
type Output struct {
	Score       float64
	Level       string
	Memberships []TermMembership
}

// Engine — порт вывода (реализуется entities/support.Engine).
type Engine interface {
	Infer(inputs map[string]float64) domainsupport.Result
}

// Проверка на этапе компиляции: доменный движок удовлетворяет порту use case.
var _ Engine = (*domainsupport.Engine)(nil)

// CalculateUseCase вычисляет степень потребности в поддержке по психотипу и
// эмоциональному состоянию.
type CalculateUseCase struct {
	engine Engine
}

// NewCalculateUseCase собирает use case с нечётким движком.
func NewCalculateUseCase(engine Engine) *CalculateUseCase {
	return &CalculateUseCase{engine: engine}
}

// Calculate проверяет вход, запускает нечёткий вывод и преобразует доменный
// результат в транспортно-независимый выход.
func (uc *CalculateUseCase) Calculate(_ context.Context, in Input) (Output, error) {
	if err := validate(in); err != nil {
		return Output{}, err
	}

	result := uc.engine.Infer(map[string]float64{
		domainsupport.VarExtraversion:      in.Extraversion,
		domainsupport.VarAgreeableness:     in.Agreeableness,
		domainsupport.VarConscientiousness: in.Conscientiousness,
		domainsupport.VarNeuroticism:       in.Neuroticism,
		domainsupport.VarOpenness:          in.Openness,
		domainsupport.VarEmotionalState:    in.EmotionalState,
	})

	memberships := make([]TermMembership, 0, len(result.Memberships))
	for _, term := range domainsupport.OutputTermOrder() {
		memberships = append(memberships, TermMembership{
			Term:       domainsupport.Label(term),
			Membership: result.Memberships[term],
		})
	}

	return Output{
		Score:       result.Score,
		Level:       domainsupport.Label(result.Term),
		Memberships: memberships,
	}, nil
}

func validate(in Input) error {
	checks := []struct {
		name     string
		value    float64
		min, max float64
	}{
		{"extraversion", in.Extraversion, traitMin, traitMax},
		{"agreeableness", in.Agreeableness, traitMin, traitMax},
		{"conscientiousness", in.Conscientiousness, traitMin, traitMax},
		{"neuroticism", in.Neuroticism, traitMin, traitMax},
		{"openness", in.Openness, traitMin, traitMax},
		{"emotionalState", in.EmotionalState, stateMin, stateMax},
	}
	for _, c := range checks {
		if c.value < c.min || c.value > c.max {
			return fmt.Errorf("%w: %s must be in [%g, %g]", shared.ErrValidation, c.name, c.min, c.max)
		}
	}
	return nil
}
