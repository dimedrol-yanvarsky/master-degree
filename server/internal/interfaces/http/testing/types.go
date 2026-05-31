package testing

import (
	"time"

	apptesting "github.com/dimedrol-yanvarsky/master-degree/server/internal/application/testing"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/emotion"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/test"
)

type answerDTO struct {
	QuestionIndex int `json:"questionIndex"`
	Value         int `json:"value"`
}

type submitRequest struct {
	TestCode string      `json:"testCode"`
	Score    float64     `json:"score"`
	Level    string      `json:"level"`
	Answers  []answerDTO `json:"answers"`
}

func (r submitRequest) toInput(userID string) apptesting.SubmitInput {
	answers := make([]test.Answer, 0, len(r.Answers))
	for _, a := range r.Answers {
		answers = append(answers, test.Answer{QuestionIndex: a.QuestionIndex, Value: a.Value})
	}
	return apptesting.SubmitInput{
		UserID:   userID,
		TestCode: r.TestCode,
		Answers:  answers,
		Score:    r.Score,
		Level:    r.Level,
	}
}

type pointDTO struct {
	Date        string  `json:"date"`
	SupportNeed float64 `json:"supportNeed"`
	Level       string  `json:"level"`
}

type submitResponse struct {
	VertexAdded         bool      `json:"vertexAdded"`
	NotifiedSpecialists int       `json:"notifiedSpecialists"`
	Point               *pointDTO `json:"point,omitempty"`
}

func toSubmitResponse(r apptesting.SubmitResult) submitResponse {
	response := submitResponse{
		VertexAdded:         r.VertexAdded,
		NotifiedSpecialists: len(r.NotifiedEmails),
	}
	if r.VertexAdded {
		response.Point = &pointDTO{
			Date:        r.Point.Date.Format(time.RFC3339),
			SupportNeed: r.Point.SupportNeed,
			Level:       r.Point.Level,
		}
	}
	return response
}

type graphResponse struct {
	UserID string     `json:"userId"`
	Points []pointDTO `json:"points"`
}

func toGraphResponse(g emotion.Graph) graphResponse {
	points := make([]pointDTO, 0, len(g.Points))
	for _, p := range g.Points {
		points = append(points, pointDTO{
			Date:        p.Date.Format(time.RFC3339),
			SupportNeed: p.SupportNeed,
			Level:       p.Level,
		})
	}
	return graphResponse{UserID: g.UserID, Points: points}
}
