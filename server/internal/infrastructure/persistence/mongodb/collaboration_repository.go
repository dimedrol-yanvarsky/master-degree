package mongodb

import (
	"context"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/application/port"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/collaboration"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
	mongoinfra "github.com/dimedrol-yanvarsky/master-degree/server/internal/infrastructure/mongodb"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var _ port.CollaborationRepository = (*CollaborationRepository)(nil)

type CollaborationRepository struct {
	adapter *mongoinfra.Adapter
}

func NewCollaborationRepository(adapter *mongoinfra.Adapter) *CollaborationRepository {
	return &CollaborationRepository{adapter: adapter}
}

func (r *CollaborationRepository) Create(ctx context.Context, c collaboration.Collaboration) error {
	collection, err := r.adapter.Collection(collaborationsCollection)
	if err != nil {
		return err
	}

	_, err = collection.InsertOne(ctx, collaborationToDocument(c))
	if isDuplicateKey(err) {
		return shared.ErrConflict
	}
	return err
}

func (r *CollaborationRepository) FindByID(ctx context.Context, id string) (collaboration.Collaboration, error) {
	collection, err := r.adapter.Collection(collaborationsCollection)
	if err != nil {
		return collaboration.Collaboration{}, err
	}

	var document collaborationDocument
	err = collection.FindOne(ctx, idMatchFilter("_id", mongoIDValue(id))).Decode(&document)
	if errorsIsNoDocuments(err) {
		return collaboration.Collaboration{}, shared.ErrNotFound
	}
	if err != nil {
		return collaboration.Collaboration{}, err
	}
	return document.toDomain(), nil
}

func (r *CollaborationRepository) FindBetween(ctx context.Context, specialistID, clientID string) (collaboration.Collaboration, error) {
	collection, err := r.adapter.Collection(collaborationsCollection)
	if err != nil {
		return collaboration.Collaboration{}, err
	}

	filter := bson.D{{Key: "$and", Value: bson.A{
		idMatchFilter("specialist_id", mongoIDValue(specialistID)),
		idMatchFilter("client_id", mongoIDValue(clientID)),
	}}}
	var document collaborationDocument
	err = collection.FindOne(ctx, filter, options.FindOne().SetSort(bson.D{{Key: "started_at", Value: -1}})).Decode(&document)
	if errorsIsNoDocuments(err) {
		return collaboration.Collaboration{}, shared.ErrNotFound
	}
	if err != nil {
		return collaboration.Collaboration{}, err
	}
	return document.toDomain(), nil
}

func (r *CollaborationRepository) ListByClient(ctx context.Context, clientID string) ([]collaboration.Collaboration, error) {
	collection, err := r.adapter.Collection(collaborationsCollection)
	if err != nil {
		return nil, err
	}

	cursor, err := collection.Find(ctx, idMatchFilter("client_id", mongoIDValue(clientID)), options.Find().SetSort(bson.D{{Key: "started_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	items := make([]collaboration.Collaboration, 0)
	for cursor.Next(ctx) {
		var document collaborationDocument
		if err := cursor.Decode(&document); err != nil {
			return nil, err
		}
		items = append(items, document.toDomain())
	}
	return items, cursor.Err()
}

func (r *CollaborationRepository) ListBySpecialist(ctx context.Context, specialistID string) ([]collaboration.Collaboration, error) {
	collection, err := r.adapter.Collection(collaborationsCollection)
	if err != nil {
		return nil, err
	}

	cursor, err := collection.Find(ctx, idMatchFilter("specialist_id", mongoIDValue(specialistID)), options.Find().SetSort(bson.D{{Key: "started_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	items := make([]collaboration.Collaboration, 0)
	for cursor.Next(ctx) {
		var document collaborationDocument
		if err := cursor.Decode(&document); err != nil {
			return nil, err
		}
		items = append(items, document.toDomain())
	}
	return items, cursor.Err()
}

func (r *CollaborationRepository) Update(ctx context.Context, c collaboration.Collaboration) error {
	collection, err := r.adapter.Collection(collaborationsCollection)
	if err != nil {
		return err
	}

	result, err := collection.UpdateOne(
		ctx,
		idMatchFilter("_id", mongoIDValue(c.ID)),
		bson.D{{Key: "$set", Value: bson.D{
			{Key: "specialist_id", Value: mongoIDValue(c.SpecialistID)},
			{Key: "client_id", Value: mongoIDValue(c.ClientID)},
			{Key: "started_at", Value: c.StartedAt},
			{Key: "status", Value: collaborationStatusToDB(c.Status)},
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

type collaborationDocument struct {
	ID           any       `bson:"_id,omitempty"`
	SpecialistID any       `bson:"specialist_id,omitempty"`
	ClientID     any       `bson:"client_id,omitempty"`
	StartedAt    time.Time `bson:"started_at,omitempty"`
	Status       string    `bson:"status,omitempty"`
}

func collaborationToDocument(c collaboration.Collaboration) bson.D {
	return bson.D{
		{Key: "_id", Value: mongoIDValue(c.ID)},
		{Key: "specialist_id", Value: mongoIDValue(c.SpecialistID)},
		{Key: "client_id", Value: mongoIDValue(c.ClientID)},
		{Key: "started_at", Value: c.StartedAt},
		{Key: "status", Value: collaborationStatusToDB(c.Status)},
	}
}

func (d collaborationDocument) toDomain() collaboration.Collaboration {
	return collaboration.Collaboration{
		ID:           idString(d.ID),
		SpecialistID: idString(d.SpecialistID),
		ClientID:     idString(d.ClientID),
		StartedAt:    d.StartedAt,
		Status:       collaborationStatusFromDB(d.Status),
	}
}

func collaborationStatusToDB(status collaboration.Status) string {
	switch status {
	case collaboration.StatusAccepted:
		return "active"
	case "":
		return "pending"
	default:
		return string(status)
	}
}

func collaborationStatusFromDB(status string) collaboration.Status {
	switch status {
	case "active":
		return collaboration.StatusAccepted
	case "":
		return collaboration.StatusPending
	default:
		return collaboration.Status(status)
	}
}
