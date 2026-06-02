package mongodb

import (
	"context"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/user"
	mongoinfra "github.com/dimedrol-yanvarsky/master-degree/server/internal/frameworks/mongodb"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var _ port.UserRepository = (*UserRepository)(nil)

type UserRepository struct {
	adapter *mongoinfra.Adapter
}

func NewUserRepository(adapter *mongoinfra.Adapter) *UserRepository {
	return &UserRepository{adapter: adapter}
}

func (r *UserRepository) Create(ctx context.Context, u user.User) error {
	collection, err := r.adapter.Collection(usersCollection)
	if err != nil {
		return err
	}

	_, err = collection.InsertOne(ctx, userToDocument(u))
	if isDuplicateKey(err) {
		return shared.ErrConflict
	}
	return err
}

func (r *UserRepository) FindByID(ctx context.Context, id string) (user.User, error) {
	collection, err := r.adapter.Collection(usersCollection)
	if err != nil {
		return user.User{}, err
	}

	var document userDocument
	err = collection.FindOne(ctx, idMatchFilter("_id", mongoIDValue(id))).Decode(&document)
	if errorsIsNoDocuments(err) {
		return user.User{}, shared.ErrNotFound
	}
	if err != nil {
		return user.User{}, err
	}
	return document.toDomain(), nil
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (user.User, error) {
	collection, err := r.adapter.Collection(usersCollection)
	if err != nil {
		return user.User{}, err
	}

	var document userDocument
	err = collection.FindOne(ctx, bson.D{{Key: "email", Value: normalizeEmail(email)}}).Decode(&document)
	if errorsIsNoDocuments(err) {
		return user.User{}, shared.ErrNotFound
	}
	if err != nil {
		return user.User{}, err
	}
	return document.toDomain(), nil
}

func (r *UserRepository) List(ctx context.Context) ([]user.User, error) {
	collection, err := r.adapter.Collection(usersCollection)
	if err != nil {
		return nil, err
	}

	cursor, err := collection.Find(ctx, bson.D{}, options.Find().SetSort(bson.D{
		{Key: "created_at", Value: -1},
		{Key: "email", Value: 1},
	}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	items := make([]user.User, 0)
	for cursor.Next(ctx) {
		var document userDocument
		if err := cursor.Decode(&document); err != nil {
			return nil, err
		}
		items = append(items, document.toDomain())
	}
	if err := cursor.Err(); err != nil {
		return nil, err
	}

	sort.SliceStable(items, func(i, j int) bool {
		if items[i].CreatedAt.Equal(items[j].CreatedAt) {
			return items[i].Email < items[j].Email
		}
		return items[i].CreatedAt.After(items[j].CreatedAt)
	})
	return items, nil
}

func (r *UserRepository) Update(ctx context.Context, u user.User) error {
	collection, err := r.adapter.Collection(usersCollection)
	if err != nil {
		return err
	}

	setFields := bson.D{
		{Key: "first_name", Value: strings.TrimSpace(u.Name)},
		{Key: "last_name", Value: strings.TrimSpace(u.Surname)},
		{Key: "patronymic", Value: strings.TrimSpace(u.Patronymic)},
		{Key: "email", Value: normalizeEmail(u.Email)},
		{Key: "account_status", Value: accountStatusString(u.Status)},
		{Key: "password_hash", Value: u.PasswordHash},
		{Key: "role", Value: roleString(u.Role)},
		{Key: "is_yandex_linked", Value: u.YandexLinked},
		{Key: "description", Value: strings.TrimSpace(u.About)},
		{Key: "experience", Value: profileExperienceValue(u.Experience)},
	}
	unsetFields := bson.D{}
	if u.PasswordResetTokenHash != "" {
		setFields = append(setFields, bson.E{Key: "password_reset_token_hash", Value: u.PasswordResetTokenHash})
	} else {
		unsetFields = append(unsetFields, bson.E{Key: "password_reset_token_hash", Value: ""})
	}
	if u.PasswordResetExpiresAt != nil {
		setFields = append(setFields, bson.E{Key: "password_reset_expires_at", Value: u.PasswordResetExpiresAt})
	} else {
		unsetFields = append(unsetFields, bson.E{Key: "password_reset_expires_at", Value: ""})
	}

	update := bson.D{{Key: "$set", Value: setFields}}
	if len(unsetFields) > 0 {
		update = append(update, bson.E{Key: "$unset", Value: unsetFields})
	}

	result, err := collection.UpdateOne(ctx, idMatchFilter("_id", mongoIDValue(u.ID)), update)
	if isDuplicateKey(err) {
		return shared.ErrConflict
	}
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return shared.ErrNotFound
	}
	return nil
}

type userDocument struct {
	ID                     any        `bson:"_id,omitempty"`
	Email                  string     `bson:"email,omitempty"`
	Name                   string     `bson:"name,omitempty"`
	FirstName              string     `bson:"first_name,omitempty"`
	Surname                string     `bson:"surname,omitempty"`
	LastName               string     `bson:"last_name,omitempty"`
	Patronymic             string     `bson:"patronymic,omitempty"`
	About                  string     `bson:"about,omitempty"`
	Description            string     `bson:"description,omitempty"`
	Experience             any        `bson:"experience,omitempty"`
	PasswordHash           string     `bson:"password_hash,omitempty"`
	PasswordHashJS         string     `bson:"passwordHash,omitempty"`
	PasswordResetTokenHash string     `bson:"password_reset_token_hash,omitempty"`
	PasswordResetExpiresAt *time.Time `bson:"password_reset_expires_at,omitempty"`
	Role                   string     `bson:"role,omitempty"`
	AccountStatus          string     `bson:"account_status,omitempty"`
	Status                 string     `bson:"status,omitempty"`
	YandexLinked           bool       `bson:"is_yandex_linked,omitempty"`
	YandexLinkedJS         bool       `bson:"yandexLinked,omitempty"`
	CreatedAt              time.Time  `bson:"created_at,omitempty"`
}

func (d userDocument) toDomain() user.User {
	return user.User{
		ID:                     idString(d.ID),
		Email:                  normalizeEmail(d.Email),
		Name:                   firstNonEmpty(d.FirstName, d.Name),
		Surname:                firstNonEmpty(d.LastName, d.Surname),
		Patronymic:             strings.TrimSpace(d.Patronymic),
		About:                  firstNonEmpty(d.Description, d.About),
		Experience:             profileExperienceString(d.Experience),
		PasswordHash:           firstNonEmpty(d.PasswordHash, d.PasswordHashJS),
		PasswordResetTokenHash: d.PasswordResetTokenHash,
		PasswordResetExpiresAt: d.PasswordResetExpiresAt,
		Role:                   shared.Role(firstNonEmpty(d.Role, string(shared.RoleClient))),
		Status:                 shared.AccountStatus(firstNonEmpty(d.AccountStatus, d.Status, string(shared.AccountActive))),
		YandexLinked:           d.YandexLinked || d.YandexLinkedJS,
		CreatedAt:              d.CreatedAt,
	}
}

func userToDocument(u user.User) bson.D {
	document := bson.D{
		{Key: "_id", Value: mongoIDValue(u.ID)},
		{Key: "first_name", Value: strings.TrimSpace(u.Name)},
		{Key: "last_name", Value: strings.TrimSpace(u.Surname)},
		{Key: "patronymic", Value: strings.TrimSpace(u.Patronymic)},
		{Key: "email", Value: normalizeEmail(u.Email)},
		{Key: "account_status", Value: accountStatusString(u.Status)},
		{Key: "password_hash", Value: u.PasswordHash},
		{Key: "role", Value: roleString(u.Role)},
		{Key: "created_at", Value: u.CreatedAt},
		{Key: "is_yandex_linked", Value: u.YandexLinked},
		{Key: "description", Value: strings.TrimSpace(u.About)},
		{Key: "experience", Value: profileExperienceValue(u.Experience)},
		{Key: "sessions", Value: bson.A{}},
		{Key: "collaboration_id", Value: nil},
	}
	if u.PasswordResetTokenHash != "" {
		document = append(document, bson.E{Key: "password_reset_token_hash", Value: u.PasswordResetTokenHash})
	}
	if u.PasswordResetExpiresAt != nil {
		document = append(document, bson.E{Key: "password_reset_expires_at", Value: u.PasswordResetExpiresAt})
	}
	return document
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func roleString(role shared.Role) string {
	if role == "" {
		return string(shared.RoleClient)
	}
	return string(role)
}

func accountStatusString(status shared.AccountStatus) string {
	if status == "" {
		return string(shared.AccountActive)
	}
	return string(status)
}

func profileExperienceValue(experience string) any {
	trimmed := strings.TrimSpace(experience)
	if trimmed == "" {
		return nil
	}
	years, err := strconv.Atoi(trimmed)
	if err != nil {
		return trimmed
	}
	return years
}

func profileExperienceString(value any) string {
	switch experience := value.(type) {
	case int:
		if experience > 0 {
			return strconv.Itoa(experience)
		}
	case int32:
		if experience > 0 {
			return strconv.Itoa(int(experience))
		}
	case int64:
		if experience > 0 {
			return strconv.Itoa(int(experience))
		}
	case float64:
		if experience > 0 {
			return strconv.Itoa(int(experience))
		}
	case string:
		trimmed := strings.TrimSpace(experience)
		if years, ok := leadingExperienceYears(trimmed); ok {
			return strconv.Itoa(years)
		}
		return trimmed
	}
	return ""
}

func leadingExperienceYears(value string) (int, bool) {
	firstToken := strings.Fields(value)
	if len(firstToken) == 0 {
		return 0, false
	}
	years, err := strconv.Atoi(firstToken[0])
	return years, err == nil && years > 0
}

func isDuplicateKey(err error) bool {
	if err == nil {
		return false
	}
	return mongo.IsDuplicateKeyError(err) || strings.Contains(err.Error(), "E11000")
}
