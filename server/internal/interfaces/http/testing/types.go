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

type domainScoreDTO struct {
	Label string  `json:"label"`
	Score float64 `json:"score"`
}

type submitRequest struct {
	TestCode   string           `json:"testCode"`
	Score      float64          `json:"score"`
	ScoreLabel string           `json:"scoreLabel"`
	Level      string           `json:"level"`
	Summary    string           `json:"summary"`
	Domains    []domainScoreDTO `json:"domains"`
	Answers    []answerDTO      `json:"answers"`
}

type createTestRequest struct {
	Title       string   `json:"title"`
	Code        string   `json:"code"`
	Description string   `json:"description"`
	Questions   []string `json:"questions"`
}

func (r createTestRequest) toInput(authorID string) apptesting.CreateTestInput {
	return apptesting.CreateTestInput{
		AuthorID:    authorID,
		Title:       r.Title,
		Code:        r.Code,
		Description: r.Description,
		Questions:   r.Questions,
	}
}

func (r createTestRequest) toUpdateInput(actorID, id string) apptesting.UpdateTestInput {
	return apptesting.UpdateTestInput{
		ActorID:     actorID,
		ID:          id,
		Title:       r.Title,
		Code:        r.Code,
		Description: r.Description,
		Questions:   r.Questions,
	}
}

func (r submitRequest) toInput(userID string) apptesting.SubmitInput {
	answers := make([]test.Answer, 0, len(r.Answers))
	for _, a := range r.Answers {
		answers = append(answers, test.Answer{QuestionIndex: a.QuestionIndex, Value: a.Value})
	}
	domains := make([]test.DomainScore, 0, len(r.Domains))
	for _, d := range r.Domains {
		domains = append(domains, test.DomainScore{Label: d.Label, Score: d.Score})
	}
	return apptesting.SubmitInput{
		UserID:     userID,
		TestCode:   r.TestCode,
		Answers:    answers,
		Score:      r.Score,
		ScoreLabel: r.ScoreLabel,
		Level:      r.Level,
		Summary:    r.Summary,
		Domains:    domains,
	}
}

type testListResponse struct {
	Items []testDTO `json:"items"`
}

type testItemResponse struct {
	Item testDTO `json:"item"`
}

type answerOptionDTO struct {
	Value int    `json:"value"`
	Label string `json:"label"`
}

type testDTO struct {
	ID             string            `json:"id"`
	ServerID       string            `json:"serverId,omitempty"`
	Code           string            `json:"code"`
	Title          string            `json:"title"`
	Description    string            `json:"description"`
	AuthorID       string            `json:"authorId,omitempty"`
	QuestionCount  int               `json:"questionCount"`
	PassingMinutes int               `json:"passingMinutes"`
	SourceNote     string            `json:"sourceNote,omitempty"`
	Questions      []string          `json:"questions"`
	Scale          []answerOptionDTO `json:"scale"`
	Status         string            `json:"status,omitempty"`
}

func toTestsResponse(items []test.Test) testListResponse {
	response := testListResponse{Items: make([]testDTO, 0, len(items))}
	for _, item := range items {
		response.Items = append(response.Items, toTestDTO(item))
	}
	return response
}

func toTestItemResponse(item test.Test) testItemResponse {
	return testItemResponse{Item: toTestDTO(item)}
}

func toTestDTO(item test.Test) testDTO {
	code := item.Code
	if code == "" {
		code = item.ID
	}
	questions := make([]string, 0, len(item.Questions))
	for _, question := range item.Questions {
		questions = append(questions, question.Text)
	}
	scale := make([]answerOptionDTO, 0, len(item.Scale))
	for _, option := range item.Scale {
		scale = append(scale, answerOptionDTO{Value: option.Value, Label: option.Label})
	}
	questionCount := item.QuestionCount
	if questionCount == 0 {
		questionCount = len(item.Questions)
	}

	return testDTO{
		ID:             code,
		ServerID:       item.ID,
		Code:           code,
		Title:          item.Title,
		Description:    item.Description,
		AuthorID:       item.AuthorID,
		QuestionCount:  questionCount,
		PassingMinutes: item.PassingMinutes,
		SourceNote:     item.SourceNote,
		Questions:      questions,
		Scale:          scale,
		Status:         item.Status,
	}
}

type testResultListResponse struct {
	Items []testResultDTO `json:"items"`
}

type testResultDTO struct {
	ID            string           `json:"id"`
	TestID        string           `json:"testId"`
	TestCode      string           `json:"testCode"`
	CompletedAt   string           `json:"completedAt"`
	Score         float64          `json:"score"`
	ScoreLabel    string           `json:"scoreLabel,omitempty"`
	Level         string           `json:"level,omitempty"`
	Summary       string           `json:"summary,omitempty"`
	Domains       []domainScoreDTO `json:"domains,omitempty"`
	Answers       []answerDTO      `json:"answers"`
	AnsweredCount int              `json:"answeredCount"`
}

func toResultsResponse(items []test.TestResult) testResultListResponse {
	response := testResultListResponse{Items: make([]testResultDTO, 0, len(items))}
	for _, item := range items {
		answers := make([]answerDTO, 0, len(item.Answers))
		for _, answer := range item.Answers {
			answers = append(answers, answerDTO{QuestionIndex: answer.QuestionIndex, Value: answer.Value})
		}
		domains := make([]domainScoreDTO, 0, len(item.Domains))
		for _, domain := range item.Domains {
			domains = append(domains, domainScoreDTO{Label: domain.Label, Score: domain.Score})
		}
		testCode := item.TestCode
		if testCode == "" {
			testCode = item.TestID
		}

		response.Items = append(response.Items, testResultDTO{
			ID:            item.ID,
			TestID:        item.TestID,
			TestCode:      testCode,
			CompletedAt:   item.CompletedAt.Format(time.RFC3339),
			Score:         item.Score,
			ScoreLabel:    item.ScoreLabel,
			Level:         item.Level,
			Summary:       item.Summary,
			Domains:       domains,
			Answers:       answers,
			AnsweredCount: len(answers),
		})
	}
	return response
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
