package mongodb

import (
	"context"
	"math"
	"sort"
	"strconv"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/emotion"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	mongoinfra "github.com/dimedrol-yanvarsky/master-degree/server/internal/frameworks/mongodb"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
	"go.mongodb.org/mongo-driver/v2/bson"
)

const emotionalStateGraphsCollection = "emotional_state_graphs"

var _ port.EmotionGraphRepository = (*EmotionGraphRepository)(nil)

type EmotionGraphRepository struct {
	adapter *mongoinfra.Adapter
}

func NewEmotionGraphRepository(adapter *mongoinfra.Adapter) *EmotionGraphRepository {
	return &EmotionGraphRepository{adapter: adapter}
}

func (r *EmotionGraphRepository) FindByUser(ctx context.Context, userID string) (emotion.Graph, error) {
	collection, err := r.adapter.Collection(emotionalStateGraphsCollection)
	if err != nil {
		return emotion.Graph{}, err
	}

	var document emotionGraphDocument
	err = collection.FindOne(ctx, idMatchFilter("user_id", mongoIDValue(userID))).Decode(&document)
	if errorsIsNoDocuments(err) {
		return emotion.Graph{}, shared.ErrNotFound
	}
	if err != nil {
		return emotion.Graph{}, err
	}
	return document.toDomain(), nil
}

func (r *EmotionGraphRepository) AppendPoint(ctx context.Context, userID string, point emotion.Point) error {
	collection, err := r.adapter.Collection(emotionalStateGraphsCollection)
	if err != nil {
		return err
	}

	level := pointToDocument(point)
	result, err := collection.UpdateOne(
		ctx,
		idMatchFilter("user_id", mongoIDValue(userID)),
		bson.D{{Key: "$push", Value: bson.D{{Key: "levels", Value: level}}}},
	)
	if err != nil {
		return err
	}
	if result.MatchedCount > 0 {
		return nil
	}

	_, err = collection.InsertOne(ctx, bson.D{
		{Key: "_id", Value: bson.NewObjectID()},
		{Key: "user_id", Value: mongoIDValue(userID)},
		{Key: "levels", Value: bson.A{level}},
	})
	if isDuplicateKey(err) {
		_, err = collection.UpdateOne(
			ctx,
			idMatchFilter("user_id", mongoIDValue(userID)),
			bson.D{{Key: "$push", Value: bson.D{{Key: "levels", Value: level}}}},
		)
	}
	return err
}

type emotionGraphDocument struct {
	ID     any                    `bson:"_id,omitempty"`
	UserID any                    `bson:"user_id,omitempty"`
	Levels []emotionLevelDocument `bson:"levels,omitempty"`
}

type emotionLevelDocument struct {
	MeasuredAt                time.Time `bson:"measured_at,omitempty"`
	Date                      time.Time `bson:"date,omitempty"`
	SupportNeed               any       `bson:"support_need,omitempty"`
	SupportNeedJS             any       `bson:"supportNeed,omitempty"`
	SupportNeedLevel          int       `bson:"support_need_level,omitempty"`
	SecondarySupportNeedLevel int       `bson:"secondary_support_need_level,omitempty"`
	SecondaryScore            any       `bson:"secondary_score,omitempty"`
	Level                     string    `bson:"level,omitempty"`
	Label                     string    `bson:"label,omitempty"`
	Score                     any       `bson:"score,omitempty"`
	Truth                     any       `bson:"truth,omitempty"`
}

func pointToDocument(point emotion.Point) emotionLevelDocument {
	return emotionLevelDocument{
		MeasuredAt:                point.Date,
		Label:                     formatGraphPointLabel(point.Date),
		SupportNeed:               point.SupportNeed,
		SupportNeedLevel:          point.SupportNeedLevel,
		SecondarySupportNeedLevel: point.SecondarySupportNeedLevel,
		Score:                     point.Score,
		SecondaryScore:            point.SecondaryScore,
		Truth:                     point.Truth,
		Level:                     point.Level,
	}
}

func formatGraphPointLabel(date time.Time) string {
	if date.IsZero() {
		return ""
	}
	return date.Format("02.01.2006")
}

func (d emotionGraphDocument) toDomain() emotion.Graph {
	points := make([]emotion.Point, 0, len(d.Levels))
	for _, level := range d.Levels {
		points = append(points, level.toDomainPoint())
	}
	sort.SliceStable(points, func(i, j int) bool {
		return points[i].Date.Before(points[j].Date)
	})
	return emotion.Graph{ID: idString(d.ID), UserID: idString(d.UserID), Points: points}
}

func (d emotionLevelDocument) toDomainPoint() emotion.Point {
	date := d.MeasuredAt
	if date.IsZero() {
		date = d.Date
	}

	supportNeed := numberAsGraphFloat(firstNonNil(d.SupportNeed, d.SupportNeedJS))
	if supportNeed == 0 && d.SupportNeedLevel > 0 {
		supportNeed = supportNeedLevelScore(d.SupportNeedLevel)
	}
	if supportNeed == 0 {
		supportNeed = numberAsGraphFloat(d.Score)
	}

	level := firstNonEmpty(d.Level, supportNeedLabel(supportNeed))
	if level == "" && d.SupportNeedLevel > 0 {
		level = strconv.Itoa(d.SupportNeedLevel)
	}

	return emotion.Point{
		Date:                      date,
		SupportNeed:               supportNeed,
		SupportNeedLevel:          d.SupportNeedLevel,
		SecondarySupportNeedLevel: d.SecondarySupportNeedLevel,
		Score:                     numberAsGraphFloat(d.Score),
		SecondaryScore:            numberAsGraphFloat(d.SecondaryScore),
		Truth:                     numberAsGraphFloat(d.Truth),
		Level:                     level,
	}
}

func numberAsGraphFloat(value any) float64 {
	switch number := value.(type) {
	case float64:
		return number
	case float32:
		return float64(number)
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

func firstNonNil(values ...any) any {
	for _, value := range values {
		if value != nil {
			return value
		}
	}
	return nil
}

func supportNeedLevelScore(level int) float64 {
	row := 5 - level
	if row < 0 {
		row = 0
	}
	if row > 4 {
		row = 4
	}
	return float64(row * 25)
}

func supportNeedLabel(score float64) string {
	if math.IsNaN(score) || score <= 0 {
		return ""
	}
	switch {
	case score <= 20:
		return "Очень низкая необходимость"
	case score <= 40:
		return "Низкая необходимость"
	case score <= 60:
		return "Средняя необходимость"
	case score <= 80:
		return "Высокая необходимость"
	default:
		return "Очень высокая необходимость"
	}
}
