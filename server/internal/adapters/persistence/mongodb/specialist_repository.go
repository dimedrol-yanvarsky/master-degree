package mongodb

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	domainspecialist "github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/specialist"
	mongoinfra "github.com/dimedrol-yanvarsky/master-degree/server/internal/frameworks/mongodb"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

const usersCollection = "users"

var _ port.SpecialistRepository = (*SpecialistRepository)(nil)

// SpecialistRepository читает публичные профили специалистов из MongoDB.
type SpecialistRepository struct {
	adapter *mongoinfra.Adapter
}

// NewSpecialistRepository создаёт MongoDB-репозиторий каталога специалистов.
func NewSpecialistRepository(adapter *mongoinfra.Adapter) *SpecialistRepository {
	return &SpecialistRepository{adapter: adapter}
}

func (r *SpecialistRepository) List(ctx context.Context) ([]domainspecialist.Profile, error) {
	collection, err := r.adapter.Collection(usersCollection)
	if err != nil {
		return nil, err
	}

	cursor, err := collection.Find(ctx, bson.D{{Key: "role", Value: "specialist"}}, options.Find().SetSort(bson.D{
		{Key: "last_name", Value: 1},
		{Key: "first_name", Value: 1},
		{Key: "patronymic", Value: 1},
	}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	profiles := make([]domainspecialist.Profile, 0)
	for cursor.Next(ctx) {
		var document specialistDocument
		if err := cursor.Decode(&document); err != nil {
			return nil, err
		}
		if document.AccountStatus != "" && document.AccountStatus != "active" {
			continue
		}

		profile := document.toDomain()
		if profile.ID == "" || profile.Name == "" {
			continue
		}
		profiles = append(profiles, profile)
	}
	if err := cursor.Err(); err != nil {
		return nil, err
	}

	return profiles, nil
}

type specialistDocument struct {
	ID            any    `bson:"_id,omitempty"`
	PublicID      string `bson:"id,omitempty"`
	Name          string `bson:"name,omitempty"`
	Surname       string `bson:"surname,omitempty"`
	LastName      string `bson:"last_name,omitempty"`
	FirstName     string `bson:"first_name,omitempty"`
	Patronymic    string `bson:"patronymic,omitempty"`
	FullName      string `bson:"fullName,omitempty"`
	Experience    any    `bson:"experience,omitempty"`
	Description   string `bson:"description,omitempty"`
	About         string `bson:"about,omitempty"`
	Color         string `bson:"color,omitempty"`
	Role          string `bson:"role,omitempty"`
	AccountStatus string `bson:"account_status,omitempty"`
}

func (d specialistDocument) toDomain() domainspecialist.Profile {
	id := strings.TrimSpace(d.PublicID)
	if id == "" {
		id = idString(d.ID)
	}

	name := firstNonEmpty(
		d.FullName,
		strings.Join(nonEmpty(firstNonEmpty(d.Surname, d.LastName), firstNonEmpty(d.Name, d.FirstName), d.Patronymic), " "),
		d.Name,
		d.FirstName,
	)

	return domainspecialist.Profile{
		ID:          id,
		Name:        name,
		Experience:  experienceString(d.Experience),
		Description: firstNonEmpty(d.Description, d.About),
		Color:       firstNonEmpty(d.Color, "var(--accent)"),
	}
}

func idString(value any) string {
	switch id := value.(type) {
	case bson.ObjectID:
		if id.IsZero() {
			return ""
		}
		return id.Hex()
	case string:
		return strings.TrimSpace(id)
	case fmt.Stringer:
		return strings.TrimSpace(id.String())
	case nil:
		return ""
	default:
		return strings.TrimSpace(fmt.Sprint(id))
	}
}

func experienceString(value any) string {
	switch experience := value.(type) {
	case int:
		if experience > 0 {
			return formatYears(experience)
		}
	case int32:
		if experience > 0 {
			return formatYears(int(experience))
		}
	case int64:
		if experience > 0 {
			return formatYears(int(experience))
		}
	case float64:
		if experience > 0 {
			return formatYears(int(experience))
		}
	case string:
		trimmed := strings.TrimSpace(experience)
		if years, ok := leadingExperienceYears(trimmed); ok {
			return formatYears(years)
		}
		return trimmed
	}
	return ""
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func nonEmpty(values ...string) []string {
	result := make([]string, 0, len(values))
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func formatYears(years int) string {
	lastTwo := years % 100
	lastOne := years % 10
	unit := "лет"
	if lastTwo < 11 || lastTwo > 14 {
		if lastOne == 1 {
			unit = "год"
		} else if lastOne >= 2 && lastOne <= 4 {
			unit = "года"
		}
	}
	return strconv.Itoa(years) + " " + unit
}
