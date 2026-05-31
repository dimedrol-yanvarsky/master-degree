package mongodb

import (
	"context"
	"strings"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/application/port"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/recommendation"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
	mongoinfra "github.com/dimedrol-yanvarsky/master-degree/server/internal/infrastructure/mongodb"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

const recommendationAssignmentsCollection = "recommendation_assignments"

var _ port.RecommendationAssignmentRepository = (*RecommendationAssignmentRepository)(nil)

type RecommendationAssignmentRepository struct {
	adapter *mongoinfra.Adapter
}

func NewRecommendationAssignmentRepository(adapter *mongoinfra.Adapter) *RecommendationAssignmentRepository {
	return &RecommendationAssignmentRepository{adapter: adapter}
}

func (r *RecommendationAssignmentRepository) Create(ctx context.Context, assignment recommendation.Assignment) error {
	collection, err := r.adapter.Collection(recommendationAssignmentsCollection)
	if err != nil {
		return err
	}

	_, err = collection.InsertOne(ctx, recommendationAssignmentToDocument(assignment))
	if isDuplicateKey(err) {
		return shared.ErrConflict
	}
	return err
}

func (r *RecommendationAssignmentRepository) FindByID(ctx context.Context, id string) (recommendation.Assignment, error) {
	collection, err := r.adapter.Collection(recommendationAssignmentsCollection)
	if err != nil {
		return recommendation.Assignment{}, err
	}

	var document recommendationAssignmentDocument
	err = collection.FindOne(ctx, activeAssignmentFilter(idMatchFilter("_id", mongoIDValue(id)))).Decode(&document)
	if errorsIsNoDocuments(err) {
		return recommendation.Assignment{}, shared.ErrNotFound
	}
	if err != nil {
		return recommendation.Assignment{}, err
	}
	return document.toDomain(), nil
}

func (r *RecommendationAssignmentRepository) ListByClient(ctx context.Context, clientID string) ([]recommendation.Assignment, error) {
	return r.list(ctx, idMatchFilter("client_id", mongoIDValue(clientID)))
}

func (r *RecommendationAssignmentRepository) ListBySpecialist(ctx context.Context, specialistID string) ([]recommendation.Assignment, error) {
	return r.list(ctx, idMatchFilter("specialist_id", mongoIDValue(specialistID)))
}

func (r *RecommendationAssignmentRepository) Update(ctx context.Context, assignment recommendation.Assignment) error {
	collection, err := r.adapter.Collection(recommendationAssignmentsCollection)
	if err != nil {
		return err
	}

	result, err := collection.UpdateOne(
		ctx,
		idMatchFilter("_id", mongoIDValue(assignment.ID)),
		bson.D{{Key: "$set", Value: bson.D{
			{Key: "block_id", Value: mongoIDValue(assignment.BlockID)},
			{Key: "collaboration_id", Value: mongoIDValue(assignment.CollaborationID)},
			{Key: "specialist_id", Value: mongoIDValue(assignment.SpecialistID)},
			{Key: "client_id", Value: mongoIDValue(assignment.ClientID)},
			{Key: "recommendation_text", Value: strings.TrimSpace(assignment.Text)},
			{Key: "assigned_at", Value: assignment.AssignedAt},
			{Key: "status", Value: firstNonEmpty(assignment.Status, "active")},
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

func (r *RecommendationAssignmentRepository) list(ctx context.Context, filter bson.D) ([]recommendation.Assignment, error) {
	collection, err := r.adapter.Collection(recommendationAssignmentsCollection)
	if err != nil {
		return nil, err
	}

	cursor, err := collection.Find(ctx, activeAssignmentFilter(filter), options.Find().SetSort(bson.D{{Key: "assigned_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	items := make([]recommendation.Assignment, 0)
	for cursor.Next(ctx) {
		var document recommendationAssignmentDocument
		if err := cursor.Decode(&document); err != nil {
			return nil, err
		}
		items = append(items, document.toDomain())
	}
	return items, cursor.Err()
}

type recommendationAssignmentDocument struct {
	ID              any       `bson:"_id,omitempty"`
	BlockID         any       `bson:"block_id,omitempty"`
	CollaborationID any       `bson:"collaboration_id,omitempty"`
	SpecialistID    any       `bson:"specialist_id,omitempty"`
	ClientID        any       `bson:"client_id,omitempty"`
	Text            string    `bson:"recommendation_text,omitempty"`
	AssignedAt      time.Time `bson:"assigned_at,omitempty"`
	Status          string    `bson:"status,omitempty"`
}

func recommendationAssignmentToDocument(assignment recommendation.Assignment) bson.D {
	return bson.D{
		{Key: "_id", Value: mongoIDValue(assignment.ID)},
		{Key: "block_id", Value: mongoIDValue(assignment.BlockID)},
		{Key: "collaboration_id", Value: mongoIDValue(assignment.CollaborationID)},
		{Key: "specialist_id", Value: mongoIDValue(assignment.SpecialistID)},
		{Key: "client_id", Value: mongoIDValue(assignment.ClientID)},
		{Key: "recommendation_text", Value: strings.TrimSpace(assignment.Text)},
		{Key: "assigned_at", Value: assignment.AssignedAt},
		{Key: "status", Value: firstNonEmpty(assignment.Status, "active")},
	}
}

func (d recommendationAssignmentDocument) toDomain() recommendation.Assignment {
	return recommendation.Assignment{
		ID:              idString(d.ID),
		BlockID:         idString(d.BlockID),
		CollaborationID: idString(d.CollaborationID),
		SpecialistID:    idString(d.SpecialistID),
		ClientID:        idString(d.ClientID),
		Text:            strings.TrimSpace(d.Text),
		AssignedAt:      d.AssignedAt,
		Status:          firstNonEmpty(d.Status, "active"),
	}
}

func activeAssignmentFilter(base bson.D) bson.D {
	statusFilter := bson.D{{Key: "$or", Value: bson.A{
		bson.D{{Key: "status", Value: "active"}},
		bson.D{{Key: "status", Value: ""}},
		bson.D{{Key: "status", Value: bson.D{{Key: "$exists", Value: false}}}},
	}}}
	if len(base) == 0 {
		return statusFilter
	}
	return bson.D{{Key: "$and", Value: bson.A{base, statusFilter}}}
}
