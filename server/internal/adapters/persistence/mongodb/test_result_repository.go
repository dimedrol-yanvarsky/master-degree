package mongodb

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	domaintest "github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/test"
	mongoinfra "github.com/dimedrol-yanvarsky/master-degree/server/internal/frameworks/mongodb"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

const testResultsCollection = "test_results"

var _ port.TestResultRepository = (*TestResultRepository)(nil)

type TestResultRepository struct {
	adapter *mongoinfra.Adapter
}

func NewTestResultRepository(adapter *mongoinfra.Adapter) *TestResultRepository {
	return &TestResultRepository{adapter: adapter}
}

func (r *TestResultRepository) Create(ctx context.Context, result domaintest.TestResult) error {
	collection, err := r.adapter.Collection(testResultsCollection)
	if err != nil {
		return err
	}

	testCode := firstNonEmpty(result.TestCode, result.TestID)
	answers := make([]bson.D, 0, len(result.Answers))
	for _, answer := range result.Answers {
		answers = append(answers, bson.D{
			{Key: "question_number", Value: answer.QuestionIndex + 1},
			{Key: "value", Value: answer.Value},
		})
	}
	domains := make([]bson.D, 0, len(result.Domains))
	for _, domain := range result.Domains {
		domains = append(domains, bson.D{
			{Key: "label", Value: domain.Label},
			{Key: "score", Value: domain.Score},
		})
	}

	_, err = collection.InsertOne(ctx, bson.D{
		{Key: "_id", Value: mongoIDValue(result.ID)},
		{Key: "user_id", Value: mongoIDValue(result.UserID)},
		{Key: "test_id", Value: mongoIDValue(result.TestID)},
		{Key: "test_code", Value: testCode},
		{Key: "answers", Value: answers},
		{Key: "verdict", Value: bson.D{
			{Key: "score", Value: result.Score},
			{Key: "score_label", Value: result.ScoreLabel},
			{Key: "level", Value: result.Level},
			{Key: "summary", Value: result.Summary},
			{Key: "domains", Value: domains},
		}},
		{Key: "completed_at", Value: result.CompletedAt},
	})
	return err
}

func (r *TestResultRepository) ListByUser(ctx context.Context, userID string) ([]domaintest.TestResult, error) {
	return r.listByUserValue(ctx, mongoIDValue(userID))
}

func (r *TestResultRepository) ListByUserEmail(ctx context.Context, email string) ([]domaintest.TestResult, error) {
	users, err := r.adapter.Collection(usersCollection)
	if err != nil {
		return nil, err
	}

	var userDocument struct {
		ID any `bson:"_id,omitempty"`
	}
	err = users.FindOne(ctx, bson.D{{Key: "email", Value: strings.TrimSpace(email)}}).Decode(&userDocument)
	if errorsIsNoDocuments(err) {
		return nil, shared.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if userDocument.ID == nil {
		return nil, shared.ErrNotFound
	}

	return r.listByUserValue(ctx, userDocument.ID)
}

func (r *TestResultRepository) listByUserValue(ctx context.Context, userID any) ([]domaintest.TestResult, error) {
	collection, err := r.adapter.Collection(testResultsCollection)
	if err != nil {
		return nil, err
	}

	cursor, err := collection.Find(ctx, idMatchFilter("user_id", userID), options.Find().SetSort(bson.D{{Key: "completed_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	results := make([]domaintest.TestResult, 0)
	for cursor.Next(ctx) {
		var document testResultDocument
		if err := cursor.Decode(&document); err != nil {
			return nil, err
		}
		result := document.toDomain(ctx, r)
		if result.TestCode == "" {
			continue
		}
		results = append(results, result)
	}
	if err := cursor.Err(); err != nil {
		return nil, err
	}
	return results, nil
}

type testResultDocument struct {
	ID          any                        `bson:"_id,omitempty"`
	UserID      any                        `bson:"user_id,omitempty"`
	TestID      any                        `bson:"test_id,omitempty"`
	TestCode    string                     `bson:"test_code,omitempty"`
	Answers     []testResultAnswerDocument `bson:"answers,omitempty"`
	Verdict     testVerdictDocument        `bson:"verdict,omitempty"`
	CompletedAt time.Time                  `bson:"completed_at,omitempty"`
}

type testResultAnswerDocument struct {
	QuestionNumber int `bson:"question_number,omitempty"`
	QuestionIndex  int `bson:"question_index,omitempty"`
	Value          int `bson:"value,omitempty"`
}

type testVerdictDocument struct {
	Score      any    `bson:"score,omitempty"`
	ScoreLabel string `bson:"score_label,omitempty"`
	Level      string `bson:"level,omitempty"`
	Summary    string `bson:"summary,omitempty"`
	Domains    any    `bson:"domains,omitempty"`
}

func (d testResultDocument) toDomain(ctx context.Context, repository *TestResultRepository) domaintest.TestResult {
	answers := make([]domaintest.Answer, 0, len(d.Answers))
	for _, answer := range d.Answers {
		index := answer.QuestionIndex
		if answer.QuestionNumber > 0 {
			index = answer.QuestionNumber - 1
		}
		answers = append(answers, domaintest.Answer{QuestionIndex: index, Value: answer.Value})
	}
	sort.SliceStable(answers, func(i, j int) bool {
		return answers[i].QuestionIndex < answers[j].QuestionIndex
	})

	testID := idString(d.TestID)
	testCode := firstNonEmpty(d.TestCode, knownTestCode(testID), repository.resolveTestCode(ctx, d.TestID))

	return domaintest.TestResult{
		ID:          idString(d.ID),
		UserID:      idString(d.UserID),
		TestID:      testID,
		TestCode:    testCode,
		Answers:     answers,
		Score:       numberAsFloat(d.Verdict.Score),
		ScoreLabel:  strings.TrimSpace(d.Verdict.ScoreLabel),
		Level:       strings.TrimSpace(d.Verdict.Level),
		Summary:     strings.TrimSpace(d.Verdict.Summary),
		Domains:     domainScores(d.Verdict.Domains),
		CompletedAt: d.CompletedAt,
	}
}

func (r *TestResultRepository) resolveTestCode(ctx context.Context, testID any) string {
	if testID == nil {
		return ""
	}

	tests, err := r.adapter.Collection(testsCollection)
	if err != nil {
		return ""
	}

	var document struct {
		Code  string `bson:"code,omitempty"`
		Title string `bson:"title,omitempty"`
	}
	err = tests.FindOne(ctx, idMatchFilter("_id", testID)).Decode(&document)
	if err != nil {
		return ""
	}
	return firstNonEmpty(document.Code, inferTestCode(document.Title))
}

func idMatchFilter(field string, value any) bson.D {
	filters := bson.A{bson.D{{Key: field, Value: value}}}
	switch typed := value.(type) {
	case bson.ObjectID:
		filters = append(filters, bson.D{{Key: field, Value: typed.Hex()}})
	case string:
		if objectID, err := bson.ObjectIDFromHex(strings.TrimSpace(typed)); err == nil {
			filters = append(filters, bson.D{{Key: field, Value: objectID}})
		}
	}
	if len(filters) == 1 {
		return filters[0].(bson.D)
	}
	return bson.D{{Key: "$or", Value: filters}}
}

func mongoIDValue(value string) any {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return ""
	}
	if objectID, err := bson.ObjectIDFromHex(trimmed); err == nil {
		return objectID
	}
	return trimmed
}

func knownTestCode(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "bfi-2", "bds":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return ""
	}
}

func domainScores(value any) []domaintest.DomainScore {
	switch typed := value.(type) {
	case bson.A:
		return domainScoresFromArray([]any(typed))
	case []any:
		return domainScoresFromArray(typed)
	case bson.D:
		return domainScoresFromDocument(typed)
	case map[string]any:
		out := make([]domaintest.DomainScore, 0, len(typed))
		for key, score := range typed {
			out = append(out, domaintest.DomainScore{Label: key, Score: numberAsFloat(score)})
		}
		sort.SliceStable(out, func(i, j int) bool { return out[i].Label < out[j].Label })
		return out
	default:
		return nil
	}
}

func domainScoresFromArray(items []any) []domaintest.DomainScore {
	out := make([]domaintest.DomainScore, 0, len(items))
	for _, item := range items {
		switch domain := item.(type) {
		case bson.D:
			out = append(out, domainScoreFromDocument(domain))
		case map[string]any:
			out = append(out, domaintest.DomainScore{
				Label: stringFromAny(domain["label"]),
				Score: numberAsFloat(domain["score"]),
			})
		}
	}
	return out
}

func domainScoresFromDocument(document bson.D) []domaintest.DomainScore {
	out := make([]domaintest.DomainScore, 0, len(document))
	for _, element := range document {
		out = append(out, domaintest.DomainScore{Label: element.Key, Score: numberAsFloat(element.Value)})
	}
	return out
}

func domainScoreFromDocument(document bson.D) domaintest.DomainScore {
	score := domaintest.DomainScore{}
	for _, element := range document {
		switch element.Key {
		case "label", "name":
			score.Label = stringFromAny(element.Value)
		case "score", "value":
			score.Score = numberAsFloat(element.Value)
		}
	}
	return score
}

func numberAsFloat(value any) float64 {
	switch number := value.(type) {
	case float64:
		return math.Round(number*10) / 10
	case float32:
		return math.Round(float64(number)*10) / 10
	case int:
		return float64(number)
	case int32:
		return float64(number)
	case int64:
		return float64(number)
	default:
		return 0
	}
}

func stringFromAny(value any) string {
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	case fmt.Stringer:
		return strings.TrimSpace(typed.String())
	default:
		return strings.TrimSpace(fmt.Sprint(value))
	}
}

func errorsIsNoDocuments(err error) bool {
	return err == mongo.ErrNoDocuments
}
