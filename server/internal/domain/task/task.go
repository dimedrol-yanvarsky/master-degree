package task

import "time"

type Task struct {
	ID        string
	Title     string
	Done      bool
	CreatedAt time.Time
	UpdatedAt time.Time
}
