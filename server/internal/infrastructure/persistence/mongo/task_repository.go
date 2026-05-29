package mongo

import (
	"context"
	"time"

	domain "github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/task"
	"go.mongodb.org/mongo-driver/v2/bson"
	drivermongo "go.mongodb.org/mongo-driver/v2/mongo"
)

type TaskRepository struct {
	collection *drivermongo.Collection
}

type taskDocument struct {
	ID        bson.ObjectID `bson:"_id,omitempty"`
	Title     string        `bson:"title"`
	Done      bool          `bson:"done"`
	CreatedAt time.Time     `bson:"createdAt"`
	UpdatedAt time.Time     `bson:"updatedAt"`
}

func NewTaskRepository(database *drivermongo.Database) *TaskRepository {
	return &TaskRepository{
		collection: database.Collection("tasks"),
	}
}

func (r *TaskRepository) Create(ctx context.Context, task domain.Task) error {
	document, err := toTaskDocument(task)
	if err != nil {
		return err
	}

	_, err = r.collection.InsertOne(ctx, document)
	return err
}

func toTaskDocument(task domain.Task) (taskDocument, error) {
	id, err := bson.ObjectIDFromHex(task.ID)
	if err != nil {
		return taskDocument{}, err
	}

	return taskDocument{
		ID:        id,
		Title:     task.Title,
		Done:      task.Done,
		CreatedAt: task.CreatedAt,
		UpdatedAt: task.UpdatedAt,
	}, nil
}
