package tasks

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type Task struct {
	ID        bson.ObjectID `bson:"_id,omitempty"`
	Title     string        `bson:"title"`
	Done      bool          `bson:"done"`
	CreatedAt time.Time     `bson:"createdAt"`
	UpdatedAt time.Time     `bson:"updatedAt"`
}
