package tasks

import (
	"context"

	"go.mongodb.org/mongo-driver/v2/mongo"
)

type Repository interface {
	Create(ctx context.Context, task *Task) error
}

type MongoRepository struct {
	collection *mongo.Collection
}

func NewMongoRepository(database *mongo.Database) *MongoRepository {
	return &MongoRepository{
		collection: database.Collection("tasks"),
	}
}

func (r *MongoRepository) Create(ctx context.Context, task *Task) error {
	_, err := r.collection.InsertOne(ctx, task)
	return err
}
