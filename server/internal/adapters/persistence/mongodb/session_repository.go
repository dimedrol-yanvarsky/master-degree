package mongodb

import (
	"context"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/user"
	mongoinfra "github.com/dimedrol-yanvarsky/master-degree/server/internal/frameworks/mongodb"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
	"go.mongodb.org/mongo-driver/v2/bson"
)

var _ port.SessionRepository = (*SessionRepository)(nil)

type SessionRepository struct {
	adapter *mongoinfra.Adapter
}

func NewSessionRepository(adapter *mongoinfra.Adapter) *SessionRepository {
	return &SessionRepository{adapter: adapter}
}

func (r *SessionRepository) Create(ctx context.Context, s user.Session) error {
	collection, err := r.adapter.Collection(usersCollection)
	if err != nil {
		return err
	}

	result, err := collection.UpdateOne(
		ctx,
		idMatchFilter("_id", mongoIDValue(s.UserID)),
		bson.D{{Key: "$push", Value: bson.D{{Key: "sessions", Value: sessionToDocument(s)}}}},
	)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return shared.ErrNotFound
	}
	return nil
}

func (r *SessionRepository) FindByID(ctx context.Context, id string) (user.Session, error) {
	collection, err := r.adapter.Collection(usersCollection)
	if err != nil {
		return user.Session{}, err
	}

	var document sessionOwnerDocument
	err = collection.FindOne(ctx, idMatchFilter("sessions._id", mongoIDValue(id))).Decode(&document)
	if errorsIsNoDocuments(err) {
		return user.Session{}, shared.ErrNotFound
	}
	if err != nil {
		return user.Session{}, err
	}

	targetID := idString(mongoIDValue(id))
	for _, session := range document.Sessions {
		if idString(session.ID) == targetID {
			return session.toDomain(idString(document.ID)), nil
		}
	}
	return user.Session{}, shared.ErrNotFound
}

func (r *SessionRepository) Revoke(ctx context.Context, id string) error {
	collection, err := r.adapter.Collection(usersCollection)
	if err != nil {
		return err
	}

	var document sessionOwnerDocument
	filter := idMatchFilter("sessions._id", mongoIDValue(id))
	err = collection.FindOne(ctx, filter).Decode(&document)
	if errorsIsNoDocuments(err) {
		return shared.ErrNotFound
	}
	if err != nil {
		return err
	}

	targetID := idString(mongoIDValue(id))
	now := time.Now()
	updated := false
	for index := range document.Sessions {
		if idString(document.Sessions[index].ID) == targetID {
			document.Sessions[index].RevokedAt = &now
			updated = true
			break
		}
	}
	if !updated {
		return shared.ErrNotFound
	}

	return r.replaceSessions(ctx, idString(document.ID), document.Sessions)
}

func (r *SessionRepository) RevokeAllForUser(ctx context.Context, userID string) error {
	collection, err := r.adapter.Collection(usersCollection)
	if err != nil {
		return err
	}

	var document sessionOwnerDocument
	filter := idMatchFilter("_id", mongoIDValue(userID))
	err = collection.FindOne(ctx, filter).Decode(&document)
	if errorsIsNoDocuments(err) {
		return shared.ErrNotFound
	}
	if err != nil {
		return err
	}

	now := time.Now()
	for index := range document.Sessions {
		if document.Sessions[index].RevokedAt == nil {
			document.Sessions[index].RevokedAt = &now
		}
	}

	result, err := collection.UpdateOne(ctx, filter, bson.D{{Key: "$set", Value: bson.D{{Key: "sessions", Value: document.Sessions}}}})
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return shared.ErrNotFound
	}
	return nil
}

func (r *SessionRepository) replaceSessions(ctx context.Context, userID string, sessions []sessionDocument) error {
	collection, err := r.adapter.Collection(usersCollection)
	if err != nil {
		return err
	}

	result, err := collection.UpdateOne(
		ctx,
		idMatchFilter("_id", mongoIDValue(userID)),
		bson.D{{Key: "$set", Value: bson.D{{Key: "sessions", Value: sessions}}}},
	)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return shared.ErrNotFound
	}
	return nil
}

type sessionOwnerDocument struct {
	ID       any               `bson:"_id,omitempty"`
	Sessions []sessionDocument `bson:"sessions,omitempty"`
}

type sessionDocument struct {
	ID        any        `bson:"_id,omitempty"`
	TokenHash string     `bson:"token_hash,omitempty"`
	UserAgent string     `bson:"user_agent,omitempty"`
	IP        string     `bson:"ip,omitempty"`
	CreatedAt time.Time  `bson:"created_at,omitempty"`
	ExpiresAt time.Time  `bson:"expires_at,omitempty"`
	RevokedAt *time.Time `bson:"revoked_at,omitempty"`
}

func sessionToDocument(s user.Session) sessionDocument {
	return sessionDocument{
		ID:        mongoIDValue(s.ID),
		TokenHash: s.TokenHash,
		UserAgent: s.UserAgent,
		IP:        s.IP,
		CreatedAt: s.CreatedAt,
		ExpiresAt: s.ExpiresAt,
		RevokedAt: s.RevokedAt,
	}
}

func (d sessionDocument) toDomain(userID string) user.Session {
	return user.Session{
		ID:        idString(d.ID),
		UserID:    userID,
		TokenHash: d.TokenHash,
		UserAgent: d.UserAgent,
		IP:        d.IP,
		CreatedAt: d.CreatedAt,
		ExpiresAt: d.ExpiresAt,
		RevokedAt: d.RevokedAt,
	}
}
