package task

import (
	"context"
	"errors"
	"testing"

	domain "github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/task"
)

type fakeTaskRepository struct {
	task domain.Task
	err  error
}

func (r *fakeTaskRepository) Create(_ context.Context, task domain.Task) error {
	r.task = task
	return r.err
}

type fixedIDGenerator struct{}

func (fixedIDGenerator) NewID() string {
	return "task-id"
}

func TestCreateTaskUseCaseCreatesTask(t *testing.T) {
	repository := &fakeTaskRepository{}
	useCase := NewCreateTaskUseCase(repository, fixedIDGenerator{})

	response, err := useCase.Create(context.Background(), CreateTaskInput{
		Title: "  First task  ",
	})
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	if repository.task.ID != "task-id" {
		t.Fatalf("expected generated id, got %q", repository.task.ID)
	}
	if repository.task.Title != "First task" {
		t.Fatalf("expected trimmed title, got %q", repository.task.Title)
	}
	if repository.task.Done {
		t.Fatal("expected new task to be not done")
	}
	if response == nil || response.ID != "task-id" {
		t.Fatal("expected response with generated id")
	}
}

func TestCreateTaskUseCaseRejectsInvalidTitle(t *testing.T) {
	repository := &fakeTaskRepository{}
	useCase := NewCreateTaskUseCase(repository, fixedIDGenerator{})

	_, err := useCase.Create(context.Background(), CreateTaskInput{
		Title: " ",
	})
	if !errors.Is(err, ErrInvalidTitle) {
		t.Fatalf("expected ErrInvalidTitle, got %v", err)
	}
	if repository.task.ID != "" {
		t.Fatal("expected invalid task not to be saved")
	}
}

func TestCreateTaskUseCaseReturnsRepositoryError(t *testing.T) {
	expectedErr := errors.New("insert failed")
	useCase := NewCreateTaskUseCase(&fakeTaskRepository{err: expectedErr}, fixedIDGenerator{})

	_, err := useCase.Create(context.Background(), CreateTaskInput{
		Title: "Task",
	})
	if !errors.Is(err, expectedErr) {
		t.Fatalf("expected repository error, got %v", err)
	}
}
