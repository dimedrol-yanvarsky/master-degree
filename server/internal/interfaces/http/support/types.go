package support

import appsupport "github.com/dimedrol-yanvarsky/master-degree/server/internal/application/support"

// calculateRequest — JSON-тело POST /support/calculate. Факторы BFI-2 ожидаются
// на [1, 5], эмоциональное состояние (BDS) — на [16, 64]; диапазоны проверяет
// use case.
type calculateRequest struct {
	Extraversion      float64 `json:"extraversion"`
	Agreeableness     float64 `json:"agreeableness"`
	Conscientiousness float64 `json:"conscientiousness"`
	Neuroticism       float64 `json:"neuroticism"`
	Openness          float64 `json:"openness"`
	EmotionalState    float64 `json:"emotionalState"`
}

func (r calculateRequest) toInput() appsupport.Input {
	return appsupport.Input{
		Extraversion:      r.Extraversion,
		Agreeableness:     r.Agreeableness,
		Conscientiousness: r.Conscientiousness,
		Neuroticism:       r.Neuroticism,
		Openness:          r.Openness,
		EmotionalState:    r.EmotionalState,
	}
}

type termMembershipResponse struct {
	Term       string  `json:"term"`
	Membership float64 `json:"membership"`
}

type calculateResponse struct {
	Score       float64                  `json:"score"`
	Level       string                   `json:"level"`
	Memberships []termMembershipResponse `json:"memberships"`
}

func toResponse(out appsupport.Output) calculateResponse {
	memberships := make([]termMembershipResponse, 0, len(out.Memberships))
	for _, m := range out.Memberships {
		memberships = append(memberships, termMembershipResponse{Term: m.Term, Membership: m.Membership})
	}
	return calculateResponse{
		Score:       out.Score,
		Level:       out.Level,
		Memberships: memberships,
	}
}
