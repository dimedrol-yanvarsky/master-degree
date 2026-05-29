package tasks

import (
	"context"
	"errors"
	"testing"
)

type fakeRepository struct {
	task *Task
	err  error
}

func (r *fakeRepository) Create(_ context.Context, task *Task) error {
	r.task = task
	return r.err
}

func TestServiceCreate(t *testing.T) {
	repository := &fakeRepository{}
	service := NewService(repository)

	response, err := service.Create(context.Background(), CreateTaskRequest{
		Title: "  First task  ",
	})
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	if repository.task == nil {
		t.Fatal("expected task to be saved")
	}
	if repository.task.Title != "First task" {
		t.Fatalf("expected trimmed title, got %q", repository.task.Title)
	}
	if repository.task.Done {
		t.Fatal("expected new task to be not done")
	}
	if response == nil || response.ID == "" {
		t.Fatal("expected response with id")
	}
}

func TestServiceCreateRejectsInvalidTitle(t *testing.T) {
	repository := &fakeRepository{}
	service := NewService(repository)

	_, err := service.Create(context.Background(), CreateTaskRequest{
		Title: " ",
	})
	if !errors.Is(err, ErrInvalidTitle) {
		t.Fatalf("expected ErrInvalidTitle, got %v", err)
	}
	if repository.task != nil {
		t.Fatal("expected invalid task not to be saved")
	}
}

func TestServiceCreateReturnsRepositoryError(t *testing.T) {
	expectedErr := errors.New("insert failed")
	service := NewService(&fakeRepository{err: expectedErr})

	_, err := service.Create(context.Background(), CreateTaskRequest{
		Title: "Task",
	})
	if !errors.Is(err, expectedErr) {
		t.Fatalf("expected repository error, got %v", err)
	}
}
