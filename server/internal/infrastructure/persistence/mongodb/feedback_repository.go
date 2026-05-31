package mongodb

import (
	"context"
	"strings"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/application/port"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/feedback"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
	mongoinfra "github.com/dimedrol-yanvarsky/master-degree/server/internal/infrastructure/mongodb"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

const reviewsCollection = "reviews"

var _ port.FeedbackRepository = (*FeedbackRepository)(nil)

type FeedbackRepository struct {
	adapter *mongoinfra.Adapter
}

func NewFeedbackRepository(adapter *mongoinfra.Adapter) *FeedbackRepository {
	return &FeedbackRepository{adapter: adapter}
}

func (r *FeedbackRepository) Create(ctx context.Context, f feedback.Feedback) error {
	collection, err := r.adapter.Collection(reviewsCollection)
	if err != nil {
		return err
	}

	_, err = collection.InsertOne(ctx, feedbackToDocument(f))
	if isDuplicateKey(err) {
		return shared.ErrConflict
	}
	return err
}

func (r *FeedbackRepository) List(ctx context.Context) ([]feedback.Feedback, error) {
	collection, err := r.adapter.Collection(reviewsCollection)
	if err != nil {
		return nil, err
	}

	cursor, err := collection.Find(ctx, notDeletedFeedbackFilter(bson.D{}), options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	items := make([]feedback.Feedback, 0)
	for cursor.Next(ctx) {
		var document feedbackDocument
		if err := cursor.Decode(&document); err != nil {
			return nil, err
		}
		items = append(items, document.toDomain())
	}
	return items, cursor.Err()
}

func (r *FeedbackRepository) FindByID(ctx context.Context, id string) (feedback.Feedback, error) {
	collection, err := r.adapter.Collection(reviewsCollection)
	if err != nil {
		return feedback.Feedback{}, err
	}

	var document feedbackDocument
	err = collection.FindOne(ctx, notDeletedFeedbackFilter(idMatchFilter("_id", mongoIDValue(id)))).Decode(&document)
	if errorsIsNoDocuments(err) {
		return feedback.Feedback{}, shared.ErrNotFound
	}
	if err != nil {
		return feedback.Feedback{}, err
	}
	return document.toDomain(), nil
}

func (r *FeedbackRepository) Update(ctx context.Context, f feedback.Feedback) error {
	collection, err := r.adapter.Collection(reviewsCollection)
	if err != nil {
		return err
	}

	result, err := collection.UpdateOne(
		ctx,
		idMatchFilter("_id", mongoIDValue(f.ID)),
		bson.D{{Key: "$set", Value: bson.D{
			{Key: "user_id", Value: mongoIDValue(f.UserID)},
			{Key: "text", Value: strings.TrimSpace(f.Body)},
			{Key: "created_at", Value: f.CreatedAt},
			{Key: "status", Value: firstNonEmpty(f.Status, "active")},
		}}},
	)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return shared.ErrNotFound
	}
	return nil
}

func (r *FeedbackRepository) Delete(ctx context.Context, id string) error {
	collection, err := r.adapter.Collection(reviewsCollection)
	if err != nil {
		return err
	}

	result, err := collection.UpdateOne(
		ctx,
		idMatchFilter("_id", mongoIDValue(id)),
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

type feedbackDocument struct {
	ID        any       `bson:"_id,omitempty"`
	UserID    any       `bson:"user_id,omitempty"`
	Text      string    `bson:"text,omitempty"`
	CreatedAt time.Time `bson:"created_at,omitempty"`
	Status    string    `bson:"status,omitempty"`
}

func feedbackToDocument(f feedback.Feedback) bson.D {
	return bson.D{
		{Key: "_id", Value: mongoIDValue(f.ID)},
		{Key: "user_id", Value: mongoIDValue(f.UserID)},
		{Key: "text", Value: strings.TrimSpace(f.Body)},
		{Key: "created_at", Value: f.CreatedAt},
		{Key: "status", Value: firstNonEmpty(f.Status, "active")},
	}
}

func (d feedbackDocument) toDomain() feedback.Feedback {
	return feedback.Feedback{
		ID:        idString(d.ID),
		UserID:    idString(d.UserID),
		Body:      strings.TrimSpace(d.Text),
		CreatedAt: d.CreatedAt,
		Status:    firstNonEmpty(d.Status, "active"),
	}
}

func notDeletedFeedbackFilter(base bson.D) bson.D {
	statusFilter := bson.D{{Key: "$or", Value: bson.A{
		bson.D{{Key: "status", Value: bson.D{{Key: "$exists", Value: false}}}},
		bson.D{{Key: "status", Value: bson.D{{Key: "$ne", Value: "deleted"}}}},
	}}}
	if len(base) == 0 {
		return statusFilter
	}
	return bson.D{{Key: "$and", Value: bson.A{base, statusFilter}}}
}
