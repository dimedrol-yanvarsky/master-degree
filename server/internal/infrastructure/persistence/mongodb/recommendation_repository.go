package mongodb

import (
	"context"
	"strings"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/application/port"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/recommendation"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
	mongoinfra "github.com/dimedrol-yanvarsky/master-degree/server/internal/infrastructure/mongodb"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

const recommendationsCollection = "recommendations"

var _ port.RecommendationRepository = (*RecommendationRepository)(nil)

type RecommendationRepository struct {
	adapter *mongoinfra.Adapter
}

func NewRecommendationRepository(adapter *mongoinfra.Adapter) *RecommendationRepository {
	return &RecommendationRepository{adapter: adapter}
}

func (r *RecommendationRepository) Create(ctx context.Context, b recommendation.Block) error {
	collection, err := r.adapter.Collection(recommendationsCollection)
	if err != nil {
		return err
	}

	_, err = collection.InsertOne(ctx, recommendationToDocument(b))
	if isDuplicateKey(err) {
		return shared.ErrConflict
	}
	return err
}

func (r *RecommendationRepository) FindByID(ctx context.Context, id string) (recommendation.Block, error) {
	collection, err := r.adapter.Collection(recommendationsCollection)
	if err != nil {
		return recommendation.Block{}, err
	}

	var document recommendationDocument
	err = collection.FindOne(ctx, activeRecommendationFilter(idMatchFilter("_id", mongoIDValue(id)))).Decode(&document)
	if errorsIsNoDocuments(err) {
		return recommendation.Block{}, shared.ErrNotFound
	}
	if err != nil {
		return recommendation.Block{}, err
	}
	return document.toDomain(), nil
}

func (r *RecommendationRepository) List(ctx context.Context) ([]recommendation.Block, error) {
	collection, err := r.adapter.Collection(recommendationsCollection)
	if err != nil {
		return nil, err
	}

	cursor, err := collection.Find(ctx, activeRecommendationFilter(bson.D{}), options.Find().SetSort(bson.D{
		{Key: "parent_block_id", Value: 1},
		{Key: "sort_order", Value: 1},
		{Key: "section_number", Value: 1},
	}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	items := make([]recommendation.Block, 0)
	for cursor.Next(ctx) {
		var document recommendationDocument
		if err := cursor.Decode(&document); err != nil {
			return nil, err
		}
		items = append(items, document.toDomain())
	}
	return items, cursor.Err()
}

func (r *RecommendationRepository) Update(ctx context.Context, b recommendation.Block) error {
	collection, err := r.adapter.Collection(recommendationsCollection)
	if err != nil {
		return err
	}

	result, err := collection.UpdateOne(
		ctx,
		activeRecommendationFilter(idMatchFilter("_id", mongoIDValue(b.ID))),
		bson.D{{Key: "$set", Value: recommendationSetDocument(b)}},
	)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return shared.ErrNotFound
	}
	return nil
}

func (r *RecommendationRepository) Delete(ctx context.Context, id string) error {
	collection, err := r.adapter.Collection(recommendationsCollection)
	if err != nil {
		return err
	}

	result, err := collection.UpdateOne(
		ctx,
		activeRecommendationFilter(idMatchFilter("_id", mongoIDValue(id))),
		bson.D{{Key: "$set", Value: bson.D{{Key: "block_status", Value: "deleted"}}}},
	)
	if err != nil {
		return err
	}
	if result.MatchedCount == 0 {
		return shared.ErrNotFound
	}
	return nil
}

type recommendationDocument struct {
	ID            any     `bson:"_id,omitempty"`
	ParentBlockID any     `bson:"parent_block_id,omitempty"`
	SectionTitle  *string `bson:"section_title,omitempty"`
	SectionNumber *string `bson:"section_number,omitempty"`
	Text          *string `bson:"recommendation_text,omitempty"`
	AuthorID      any     `bson:"author_id,omitempty"`
	Status        string  `bson:"block_status,omitempty"`
	SortOrder     int     `bson:"sort_order,omitempty"`
}

func recommendationToDocument(b recommendation.Block) bson.D {
	document := recommendationSetDocument(b)
	return append(bson.D{{Key: "_id", Value: mongoIDValue(b.ID)}}, document...)
}

func recommendationSetDocument(b recommendation.Block) bson.D {
	return bson.D{
		{Key: "parent_block_id", Value: recommendationParentValue(b.ParentID)},
		{Key: "section_title", Value: nullableStringValue(b.SectionTitle)},
		{Key: "section_number", Value: nullableStringValue(b.SectionNumber)},
		{Key: "recommendation_text", Value: nullableStringValue(b.Text)},
		{Key: "author_id", Value: mongoIDValue(b.AuthorID)},
		{Key: "block_status", Value: firstNonEmpty(b.Status, "active")},
		{Key: "sort_order", Value: b.SortOrder},
	}
}

func (d recommendationDocument) toDomain() recommendation.Block {
	parentID := idString(d.ParentBlockID)
	var parent *string
	if parentID != "" {
		parent = &parentID
	}

	return recommendation.Block{
		ID:            idString(d.ID),
		ParentID:      parent,
		SectionTitle:  cleanStringPointer(d.SectionTitle),
		SectionNumber: cleanStringPointer(d.SectionNumber),
		Text:          cleanStringPointer(d.Text),
		AuthorID:      idString(d.AuthorID),
		Status:        firstNonEmpty(d.Status, "active"),
		SortOrder:     d.SortOrder,
	}
}

func recommendationParentValue(parentID *string) any {
	if parentID == nil || strings.TrimSpace(*parentID) == "" {
		return nil
	}
	return mongoIDValue(*parentID)
}

func nullableStringValue(value *string) any {
	if value == nil {
		return nil
	}
	return strings.TrimSpace(*value)
}

func cleanStringPointer(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func activeRecommendationFilter(base bson.D) bson.D {
	statusFilter := bson.D{{Key: "$or", Value: bson.A{
		bson.D{{Key: "block_status", Value: "active"}},
		bson.D{{Key: "block_status", Value: ""}},
		bson.D{{Key: "block_status", Value: bson.D{{Key: "$exists", Value: false}}}},
	}}}
	if len(base) == 0 {
		return statusFilter
	}
	return bson.D{{Key: "$and", Value: bson.A{base, statusFilter}}}
}
