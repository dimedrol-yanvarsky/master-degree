package tasks

import (
	"context"
	"errors"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

var ErrInvalidTitle = errors.New("task title must be between 2 and 120 characters")

type Service struct {
	repository Repository
}

func NewService(repository Repository) *Service {
	return &Service{
		repository: repository,
	}
}

func (s *Service) Create(ctx context.Context, request CreateTaskRequest) (*TaskResponse, error) {
	now := time.Now().UTC()
	title := strings.TrimSpace(request.Title)

	if len(title) < 2 || len(title) > 120 {
		return nil, ErrInvalidTitle
	}

	task := &Task{
		ID:        bson.NewObjectID(),
		Title:     title,
		Done:      false,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.repository.Create(ctx, task); err != nil {
		return nil, err
	}

	return toResponse(task), nil
}

func toResponse(task *Task) *TaskResponse {
	return &TaskResponse{
		ID:        task.ID.Hex(),
		Title:     task.Title,
		Done:      task.Done,
		CreatedAt: task.CreatedAt.Format(time.RFC3339),
		UpdatedAt: task.UpdatedAt.Format(time.RFC3339),
	}
}
