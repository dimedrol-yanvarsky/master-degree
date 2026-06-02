package mongodb

import (
	"context"
	"sort"
	"strings"
	"time"

	domaincollaboration "github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/collaboration"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	mongoinfra "github.com/dimedrol-yanvarsky/master-degree/server/internal/frameworks/mongodb"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

const collaborationsCollection = "collaborations"

var _ port.ClientCollaborationRepository = (*ClientCollaborationRepository)(nil)

type ClientCollaborationRepository struct {
	adapter *mongoinfra.Adapter
}

func NewClientCollaborationRepository(adapter *mongoinfra.Adapter) *ClientCollaborationRepository {
	return &ClientCollaborationRepository{adapter: adapter}
}

func (r *ClientCollaborationRepository) ListByClient(ctx context.Context, clientID string) ([]domaincollaboration.ClientSpecialist, error) {
	return r.listByClientValue(ctx, mongoIDValue(clientID))
}

func (r *ClientCollaborationRepository) ListByClientEmail(ctx context.Context, email string) ([]domaincollaboration.ClientSpecialist, error) {
	users, err := r.adapter.Collection(usersCollection)
	if err != nil {
		return nil, err
	}

	var client struct {
		ID any `bson:"_id,omitempty"`
	}
	err = users.FindOne(ctx, bson.D{{Key: "email", Value: strings.TrimSpace(email)}}).Decode(&client)
	if errorsIsNoDocuments(err) {
		return nil, shared.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if client.ID == nil {
		return nil, shared.ErrNotFound
	}
	return r.listByClientValue(ctx, client.ID)
}

func (r *ClientCollaborationRepository) listByClientValue(ctx context.Context, clientID any) ([]domaincollaboration.ClientSpecialist, error) {
	collection, err := r.adapter.Collection(collaborationsCollection)
	if err != nil {
		return nil, err
	}

	filter := bson.D{{Key: "$and", Value: bson.A{
		idMatchFilter("client_id", clientID),
		bson.D{{Key: "status", Value: bson.D{{Key: "$in", Value: bson.A{"active", "accepted"}}}}},
	}}}
	cursor, err := collection.Find(ctx, filter, options.Find().SetSort(bson.D{{Key: "started_at", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	items := make([]domaincollaboration.ClientSpecialist, 0)
	for cursor.Next(ctx) {
		var document clientCollaborationDocument
		if err := cursor.Decode(&document); err != nil {
			return nil, err
		}

		specialist, err := r.specialist(ctx, document.SpecialistID)
		if errorsIsNoDocuments(err) {
			continue
		}
		if err != nil {
			return nil, err
		}

		items = append(items, domaincollaboration.ClientSpecialist{
			ID:                    idString(document.ID),
			SpecialistID:          idString(document.SpecialistID),
			SpecialistName:        specialist.name(),
			SpecialistExperience:  experienceString(specialist.Experience),
			SpecialistDescription: firstNonEmpty(specialist.Description, specialist.About),
			StartedAt:             document.StartedAt,
			Status:                domaincollaboration.StatusAccepted,
		})
	}
	if err := cursor.Err(); err != nil {
		return nil, err
	}

	sort.SliceStable(items, func(i, j int) bool {
		return items[i].StartedAt.After(items[j].StartedAt)
	})
	return items, nil
}

func (r *ClientCollaborationRepository) specialist(ctx context.Context, id any) (clientCollaborationSpecialistDocument, error) {
	users, err := r.adapter.Collection(usersCollection)
	if err != nil {
		return clientCollaborationSpecialistDocument{}, err
	}

	var specialist clientCollaborationSpecialistDocument
	err = users.FindOne(ctx, idMatchFilter("_id", id)).Decode(&specialist)
	return specialist, err
}

type clientCollaborationDocument struct {
	ID           any       `bson:"_id,omitempty"`
	SpecialistID any       `bson:"specialist_id,omitempty"`
	ClientID     any       `bson:"client_id,omitempty"`
	StartedAt    time.Time `bson:"started_at,omitempty"`
	Status       string    `bson:"status,omitempty"`
}

type clientCollaborationSpecialistDocument struct {
	ID            any    `bson:"_id,omitempty"`
	Name          string `bson:"name,omitempty"`
	Surname       string `bson:"surname,omitempty"`
	LastName      string `bson:"last_name,omitempty"`
	FirstName     string `bson:"first_name,omitempty"`
	Patronymic    string `bson:"patronymic,omitempty"`
	FullName      string `bson:"fullName,omitempty"`
	Experience    any    `bson:"experience,omitempty"`
	Description   string `bson:"description,omitempty"`
	About         string `bson:"about,omitempty"`
	AccountStatus string `bson:"account_status,omitempty"`
}

func (d clientCollaborationSpecialistDocument) name() string {
	return firstNonEmpty(
		d.FullName,
		strings.Join(nonEmpty(firstNonEmpty(d.Surname, d.LastName), firstNonEmpty(d.Name, d.FirstName), d.Patronymic), " "),
		d.Name,
		d.FirstName,
	)
}
