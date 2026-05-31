package mongodb

import (
	"context"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/application/port"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
	domaintest "github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/test"
	mongoinfra "github.com/dimedrol-yanvarsky/master-degree/server/internal/infrastructure/mongodb"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

const testsCollection = "tests"

var _ port.TestRepository = (*TestRepository)(nil)

type TestRepository struct {
	adapter *mongoinfra.Adapter
}

func NewTestRepository(adapter *mongoinfra.Adapter) *TestRepository {
	return &TestRepository{adapter: adapter}
}

func (r *TestRepository) Create(ctx context.Context, t domaintest.Test) error {
	collection, err := r.adapter.Collection(testsCollection)
	if err != nil {
		return err
	}

	code := strings.TrimSpace(t.Code)
	if code != "" {
		count, err := collection.CountDocuments(ctx, bson.D{{Key: "code", Value: code}, {Key: "status", Value: bson.D{{Key: "$ne", Value: "deleted"}}}})
		if err != nil {
			return err
		}
		if count > 0 {
			return fmt.Errorf("%w: test code already exists", shared.ErrConflict)
		}
	}

	_, err = collection.InsertOne(ctx, testToDocument(t))
	if isDuplicateKey(err) {
		return shared.ErrConflict
	}
	return err
}

func (r *TestRepository) FindByID(ctx context.Context, id string) (domaintest.Test, error) {
	items, err := r.List(ctx)
	if err != nil {
		return domaintest.Test{}, err
	}
	for _, item := range items {
		if item.ID == id || item.Code == id {
			return item, nil
		}
	}
	return domaintest.Test{}, shared.ErrNotFound
}

func (r *TestRepository) List(ctx context.Context) ([]domaintest.Test, error) {
	collection, err := r.adapter.Collection(testsCollection)
	if err != nil {
		return nil, err
	}

	cursor, err := collection.Find(ctx, bson.D{}, options.Find().SetSort(bson.D{{Key: "created_at", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	items := make([]domaintest.Test, 0)
	for cursor.Next(ctx) {
		var document testDocument
		if err := cursor.Decode(&document); err != nil {
			return nil, err
		}
		if document.Status != "" && document.Status != "active" {
			continue
		}
		item := document.toDomain()
		if item.Code == "" || item.Title == "" {
			continue
		}
		items = append(items, item)
	}
	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return items, nil
}

func (r *TestRepository) Update(ctx context.Context, t domaintest.Test) error {
	collection, err := r.adapter.Collection(testsCollection)
	if err != nil {
		return err
	}

	code := strings.TrimSpace(t.Code)
	if code != "" {
		count, err := collection.CountDocuments(ctx, bson.D{{Key: "$and", Value: bson.A{
			bson.D{{Key: "code", Value: code}},
			bson.D{{Key: "status", Value: bson.D{{Key: "$ne", Value: "deleted"}}}},
			bson.D{{Key: "_id", Value: bson.D{{Key: "$ne", Value: mongoIDValue(t.ID)}}}},
		}}})
		if err != nil {
			return err
		}
		if count > 0 {
			return fmt.Errorf("%w: test code already exists", shared.ErrConflict)
		}
	}

	result, err := collection.UpdateOne(
		ctx,
		idMatchFilter("_id", mongoIDValue(t.ID)),
		bson.D{{Key: "$set", Value: testUpdateDocument(t)}},
	)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return shared.ErrNotFound
	}
	return nil
}

func (r *TestRepository) Delete(ctx context.Context, id string) error {
	collection, err := r.adapter.Collection(testsCollection)
	if err != nil {
		return err
	}

	item, err := r.FindByID(ctx, id)
	if err != nil {
		return err
	}
	result, err := collection.UpdateOne(
		ctx,
		idMatchFilter("_id", mongoIDValue(item.ID)),
		bson.D{{Key: "$set", Value: bson.D{{Key: "status", Value: "deleted"}}}},
	)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return shared.ErrNotFound
	}
	return nil
}

type testDocument struct {
	ID            any                     `bson:"_id,omitempty"`
	Code          string                  `bson:"code,omitempty"`
	Title         string                  `bson:"title,omitempty"`
	Description   string                  `bson:"description,omitempty"`
	AuthorID      any                     `bson:"author_id,omitempty"`
	Status        string                  `bson:"status,omitempty"`
	QuestionCount int                     `bson:"question_count,omitempty"`
	PassingTime   time.Time               `bson:"passing_time,omitempty"`
	Questions     []testQuestionDocument  `bson:"questions,omitempty"`
	ResultLogic   testResultLogicDocument `bson:"result_logic,omitempty"`
	CreatedAt     time.Time               `bson:"created_at,omitempty"`
}

type testQuestionDocument struct {
	Order int                 `bson:"order,omitempty"`
	Text  string              `bson:"text,omitempty"`
	Type  string              `bson:"type,omitempty"`
	Scale []testScaleDocument `bson:"scale,omitempty"`
}

type testScaleDocument struct {
	Value int    `bson:"value,omitempty"`
	Label string `bson:"label,omitempty"`
}

type testResultLogicDocument struct {
	Scale      []testScaleDocument `bson:"scale,omitempty"`
	Source     string              `bson:"source,omitempty"`
	ItemPrefix string              `bson:"item_prefix,omitempty"`
}

func (d testDocument) toDomain() domaintest.Test {
	questions := make([]domaintest.Question, 0, len(d.Questions))
	for index, question := range d.Questions {
		order := question.Order
		if order == 0 {
			order = index + 1
		}
		questions = append(questions, domaintest.Question{
			Index: order - 1,
			Text:  strings.TrimSpace(question.Text),
		})
	}
	sort.SliceStable(questions, func(i, j int) bool {
		return questions[i].Index < questions[j].Index
	})

	scaleSource := d.ResultLogic.Scale
	if len(scaleSource) == 0 {
		for _, question := range d.Questions {
			if len(question.Scale) > 0 {
				scaleSource = question.Scale
				break
			}
		}
	}
	scale := make([]domaintest.AnswerOption, 0, len(scaleSource))
	for _, option := range scaleSource {
		scale = append(scale, domaintest.AnswerOption{Value: option.Value, Label: strings.TrimSpace(option.Label)})
	}
	sort.SliceStable(scale, func(i, j int) bool {
		return scale[i].Value < scale[j].Value
	})

	questionCount := d.QuestionCount
	if questionCount == 0 {
		questionCount = len(questions)
	}

	code := strings.TrimSpace(d.Code)
	if code == "" {
		code = inferTestCode(d.Title)
	}

	return domaintest.Test{
		ID:             idString(d.ID),
		Code:           code,
		Title:          strings.TrimSpace(d.Title),
		Description:    strings.TrimSpace(d.Description),
		AuthorID:       idString(d.AuthorID),
		QuestionCount:  questionCount,
		PassingMinutes: passingMinutes(d.PassingTime),
		SourceNote:     strings.TrimSpace(d.ResultLogic.Source),
		Questions:      questions,
		Scale:          scale,
		Status:         d.Status,
		CreatedAt:      d.CreatedAt,
	}
}

func testUpdateDocument(t domaintest.Test) bson.D {
	document := testToDocument(t)
	out := make(bson.D, 0, len(document))
	for _, element := range document {
		if element.Key == "_id" {
			continue
		}
		out = append(out, element)
	}
	return out
}

func testToDocument(t domaintest.Test) bson.D {
	questions := make([]testQuestionDocument, 0, len(t.Questions))
	for index, question := range t.Questions {
		order := question.Index + 1
		if order <= 0 {
			order = index + 1
		}
		questions = append(questions, testQuestionDocument{
			Order: order,
			Text:  strings.TrimSpace(question.Text),
			Type:  "scale",
			Scale: scaleToDocuments(t.Scale),
		})
	}

	status := strings.TrimSpace(t.Status)
	if status == "" {
		status = "active"
	}

	return bson.D{
		{Key: "_id", Value: mongoIDValue(t.ID)},
		{Key: "code", Value: strings.TrimSpace(t.Code)},
		{Key: "title", Value: strings.TrimSpace(t.Title)},
		{Key: "description", Value: strings.TrimSpace(t.Description)},
		{Key: "status", Value: status},
		{Key: "question_count", Value: t.QuestionCount},
		{Key: "passing_time", Value: passingTimeValue(t.PassingMinutes)},
		{Key: "questions", Value: questions},
		{Key: "result_logic", Value: testResultLogicDocument{
			Scale:  scaleToDocuments(t.Scale),
			Source: strings.TrimSpace(t.SourceNote),
		}},
		{Key: "created_at", Value: t.CreatedAt},
		{Key: "author_id", Value: mongoIDValue(t.AuthorID)},
	}
}

func scaleToDocuments(scale []domaintest.AnswerOption) []testScaleDocument {
	out := make([]testScaleDocument, 0, len(scale))
	for _, option := range scale {
		out = append(out, testScaleDocument{Value: option.Value, Label: strings.TrimSpace(option.Label)})
	}
	return out
}

func inferTestCode(title string) string {
	lower := strings.ToLower(title)
	if strings.Contains(lower, "bfi") || strings.Contains(lower, "big five") {
		return "bfi-2"
	}
	if strings.Contains(lower, "bds") || strings.Contains(lower, "breakup distress") {
		return "bds"
	}

	match := regexp.MustCompile(`\(([^)]+)\)`).FindStringSubmatch(title)
	if len(match) == 2 {
		return strings.ToLower(strings.TrimSpace(match[1]))
	}
	return strings.ToLower(strings.ReplaceAll(strings.TrimSpace(title), " ", "-"))
}

func passingMinutes(value time.Time) int {
	if value.IsZero() {
		return 0
	}
	duration := value.Sub(time.Unix(0, 0).UTC())
	if duration < 0 {
		return 0
	}
	minutes := int(duration.Round(time.Minute) / time.Minute)
	if minutes < 1 {
		return 1
	}
	return minutes
}

func passingTimeValue(minutes int) time.Time {
	if minutes <= 0 {
		return time.Time{}
	}
	return time.Unix(0, 0).UTC().Add(time.Duration(minutes) * time.Minute)
}
