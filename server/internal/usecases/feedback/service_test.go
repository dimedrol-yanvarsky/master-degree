package feedback

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	domainfeedback "github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/feedback"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/user"
)

type fakeFeedbackRepo struct {
	items []domainfeedback.Feedback
}

func (f *fakeFeedbackRepo) Create(_ context.Context, item domainfeedback.Feedback) error {
	f.items = append(f.items, item)
	return nil
}

func (f *fakeFeedbackRepo) List(_ context.Context) ([]domainfeedback.Feedback, error) {
	return append([]domainfeedback.Feedback(nil), f.items...), nil
}

func (f *fakeFeedbackRepo) FindByID(_ context.Context, id string) (domainfeedback.Feedback, error) {
	for _, item := range f.items {
		if item.ID == id {
			return item, nil
		}
	}
	return domainfeedback.Feedback{}, shared.ErrNotFound
}

func (f *fakeFeedbackRepo) Update(_ context.Context, item domainfeedback.Feedback) error {
	for index := range f.items {
		if f.items[index].ID == item.ID {
			f.items[index] = item
			return nil
		}
	}
	return shared.ErrNotFound
}

func (f *fakeFeedbackRepo) Delete(ctx context.Context, id string) error {
	item, err := f.FindByID(ctx, id)
	if err != nil {
		return err
	}
	item.Status = StatusDeleted
	return f.Update(ctx, item)
}

type fakeUserRepo struct {
	items map[string]user.User
}

func (f fakeUserRepo) Create(_ context.Context, item user.User) error {
	f.items[item.ID] = item
	return nil
}

func (f fakeUserRepo) FindByID(_ context.Context, id string) (user.User, error) {
	item, ok := f.items[id]
	if !ok {
		return user.User{}, shared.ErrNotFound
	}
	return item, nil
}

func (f fakeUserRepo) FindByEmail(_ context.Context, email string) (user.User, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	for _, item := range f.items {
		if item.Email == email {
			return item, nil
		}
	}
	return user.User{}, shared.ErrNotFound
}

func (f fakeUserRepo) List(_ context.Context) ([]user.User, error) {
	out := make([]user.User, 0, len(f.items))
	for _, item := range f.items {
		out = append(out, item)
	}
	return out, nil
}

func (f fakeUserRepo) Update(_ context.Context, item user.User) error {
	if _, ok := f.items[item.ID]; !ok {
		return shared.ErrNotFound
	}
	f.items[item.ID] = item
	return nil
}

type fakeIDs struct {
	values []string
	index  int
}

func (f *fakeIDs) NewID() string {
	if f.index >= len(f.values) {
		return ""
	}
	value := f.values[f.index]
	f.index++
	return value
}

type fixedClock struct {
	value time.Time
}

func (c fixedClock) Now() time.Time {
	return c.value
}

func TestCreateStoresPendingReview(t *testing.T) {
	ctx := context.Background()
	now := time.Date(2026, 5, 31, 12, 0, 0, 0, time.UTC)
	reviews := &fakeFeedbackRepo{}
	users := fakeUserRepo{items: map[string]user.User{
		"user-1": {ID: "user-1", Email: "client@example.com", Name: "Анна", Surname: "Иванова"},
	}}
	service := NewService(Deps{
		Feedback: reviews,
		Users:    users,
		IDs:      &fakeIDs{values: []string{"review-1"}},
		Clock:    fixedClock{value: now},
	})

	created, err := service.Create(ctx, "user-1", "  Очень помогло увидеть динамику состояния.  ")
	if err != nil {
		t.Fatalf("create review: %v", err)
	}
	if created.ID != "review-1" || created.Status != StatusPending {
		t.Fatalf("created review metadata = %+v", created)
	}
	if created.Body != "Очень помогло увидеть динамику состояния." || !created.CreatedAt.Equal(now) {
		t.Fatalf("created review content/date = %+v", created)
	}
	if created.AuthorName != "Иванова Анна" || created.AuthorEmail != "client@example.com" {
		t.Fatalf("author fields = %q/%q", created.AuthorName, created.AuthorEmail)
	}

	publicItems, err := service.List(ctx)
	if err != nil {
		t.Fatalf("list public reviews: %v", err)
	}
	if len(publicItems) != 0 {
		t.Fatalf("pending review is public, count = %d", len(publicItems))
	}
}

func TestListReturnsOnlyPublicReviewsAndModerationReturnsAll(t *testing.T) {
	ctx := context.Background()
	now := time.Date(2026, 5, 31, 12, 0, 0, 0, time.UTC)
	reviews := &fakeFeedbackRepo{items: []domainfeedback.Feedback{
		{ID: "active", UserID: "user-1", Body: "Опубликованный отзыв", Status: StatusActive, CreatedAt: now},
		{ID: "legacy", UserID: "user-1", Body: "Старый отзыв без статуса", CreatedAt: now},
		{ID: "pending", UserID: "user-1", Body: "Ожидает модерации", Status: StatusPending, CreatedAt: now},
		{ID: "hidden", UserID: "user-1", Body: "Скрытый отзыв", Status: StatusHidden, CreatedAt: now},
	}}
	users := fakeUserRepo{items: map[string]user.User{
		"user-1": {ID: "user-1", Email: "client@example.com", Name: "Анна", Surname: "Иванова"},
	}}
	service := NewService(Deps{Feedback: reviews, Users: users})

	publicItems, err := service.List(ctx)
	if err != nil {
		t.Fatalf("list public reviews: %v", err)
	}
	if len(publicItems) != 2 {
		t.Fatalf("public reviews count = %d, want 2", len(publicItems))
	}
	if publicItems[0].AuthorName != "Иванова Анна" || publicItems[0].AuthorEmail != "client@example.com" {
		t.Fatalf("author fields = %q/%q", publicItems[0].AuthorName, publicItems[0].AuthorEmail)
	}

	moderationItems, err := service.ListModeration(ctx)
	if err != nil {
		t.Fatalf("list moderation reviews: %v", err)
	}
	if len(moderationItems) != 4 {
		t.Fatalf("moderation reviews count = %d, want 4", len(moderationItems))
	}
}

func TestSetStatusUpdatesReviewAndRejectsUnsupportedStatus(t *testing.T) {
	ctx := context.Background()
	reviews := &fakeFeedbackRepo{items: []domainfeedback.Feedback{
		{ID: "review-1", Body: "Текст", Status: StatusPending},
	}}
	service := NewService(Deps{Feedback: reviews})

	if err := service.SetStatus(ctx, "review-1", StatusActive); err != nil {
		t.Fatalf("set status: %v", err)
	}
	updated, err := reviews.FindByID(ctx, "review-1")
	if err != nil {
		t.Fatalf("find updated review: %v", err)
	}
	if updated.Status != StatusActive {
		t.Fatalf("status = %q, want %q", updated.Status, StatusActive)
	}

	if err := service.SetStatus(ctx, "review-1", StatusDeleted); !errors.Is(err, shared.ErrValidation) {
		t.Fatalf("unsupported status error = %v, want validation", err)
	}
}
