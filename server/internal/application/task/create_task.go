package task

import (
	"context"
	"errors"
	"strings"
	"time"

	domain "github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/task"
)

var ErrInvalidTitle = errors.New("task title must be between 2 and 120 characters")

type CreateTaskRepository interface {
	Create(ctx context.Context, task domain.Task) error
}

type IDGenerator interface {
	NewID() string
}

type CreateTaskInput struct {
	Title string
}

type TaskOutput struct {
	ID        string
	Title     string
	Done      bool
	CreatedAt string
	UpdatedAt string
}

type CreateTaskUseCase struct {
	repository  CreateTaskRepository
	idGenerator IDGenerator
}

func NewCreateTaskUseCase(repository CreateTaskRepository, idGenerator IDGenerator) *CreateTaskUseCase {
	return &CreateTaskUseCase{
		repository:  repository,
		idGenerator: idGenerator,
	}
}

func (uc *CreateTaskUseCase) Create(ctx context.Context, input CreateTaskInput) (*TaskOutput, error) {
	now := time.Now().UTC()
	title := strings.TrimSpace(input.Title)

	if len(title) < 2 || len(title) > 120 {
		return nil, ErrInvalidTitle
	}

	task := domain.Task{
		ID:        uc.idGenerator.NewID(),
		Title:     title,
		Done:      false,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := uc.repository.Create(ctx, task); err != nil {
		return nil, err
	}

	return toOutput(task), nil
}

func toOutput(task domain.Task) *TaskOutput {
	return &TaskOutput{
		ID:        task.ID,
		Title:     task.Title,
		Done:      task.Done,
		CreatedAt: task.CreatedAt.Format(time.RFC3339),
		UpdatedAt: task.UpdatedAt.Format(time.RFC3339),
	}
}
