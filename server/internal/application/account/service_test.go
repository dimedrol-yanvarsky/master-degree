package account

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/application/port"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/user"
)

type fakeUsers struct {
	byID    map[string]user.User
	byEmail map[string]string
}

func newFakeUsers() *fakeUsers {
	return &fakeUsers{byID: map[string]user.User{}, byEmail: map[string]string{}}
}

func (f *fakeUsers) Create(_ context.Context, u user.User) error {
	if _, exists := f.byEmail[u.Email]; exists {
		return shared.ErrConflict
	}
	f.byID[u.ID] = u
	f.byEmail[u.Email] = u.ID
	return nil
}

func (f *fakeUsers) FindByID(_ context.Context, id string) (user.User, error) {
	u, ok := f.byID[id]
	if !ok {
		return user.User{}, shared.ErrNotFound
	}
	return u, nil
}

func (f *fakeUsers) FindByEmail(_ context.Context, email string) (user.User, error) {
	id, ok := f.byEmail[strings.ToLower(strings.TrimSpace(email))]
	if !ok {
		return user.User{}, shared.ErrNotFound
	}
	return f.byID[id], nil
}

func (f *fakeUsers) List(_ context.Context) ([]user.User, error) {
	items := make([]user.User, 0, len(f.byID))
	for _, item := range f.byID {
		items = append(items, item)
	}
	return items, nil
}

func (f *fakeUsers) Update(_ context.Context, u user.User) error {
	if _, ok := f.byID[u.ID]; !ok {
		return shared.ErrNotFound
	}
	f.byID[u.ID] = u
	f.byEmail[u.Email] = u.ID
	return nil
}

type fakeHasher struct{}

func (fakeHasher) Hash(password string) (string, error) { return "h:" + password, nil }
func (fakeHasher) Compare(hash, password string) bool   { return hash == "h:"+password }

type fakeIDs struct{ n int }

func (f *fakeIDs) NewID() string {
	f.n++
	return "id"
}

type fixedClock struct{ t time.Time }

func (c fixedClock) Now() time.Time { return c.t }

type fakePasswordResetNotifier struct {
	notification port.PasswordResetNotification
}

func (f *fakePasswordResetNotifier) SendPasswordReset(_ context.Context, notification port.PasswordResetNotification) error {
	f.notification = notification
	return nil
}

func TestCreateUserStoresAccountAndSendsPasswordSetupLink(t *testing.T) {
	ctx := context.Background()
	users := newFakeUsers()
	notifier := &fakePasswordResetNotifier{}
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	service := NewService(Deps{
		Users:          users,
		Hasher:         fakeHasher{},
		IDs:            &fakeIDs{},
		Clock:          fixedClock{t: now},
		PasswordResets: notifier,
		FrontendURL:    "http://frontend.local",
	})

	created, err := service.CreateUser(ctx, CreateUserInput{
		Email:   "New.User@Example.COM",
		Name:    "Анна",
		Surname: "Иванова",
		Role:    shared.RoleSpecialist,
	})
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	if created.Email != "new.user@example.com" {
		t.Fatalf("email = %q, want normalized email", created.Email)
	}
	if created.Role != shared.RoleSpecialist || created.Status != shared.AccountActive {
		t.Fatalf("unexpected role/status: %+v", created)
	}
	if created.PasswordHash == "" || created.PasswordResetTokenHash == "" || created.PasswordResetExpiresAt == nil {
		t.Fatalf("expected password hash and reset token fields: %+v", created)
	}
	if !created.PasswordResetExpiresAt.Equal(now.Add(accountInviteTTL)) {
		t.Fatalf("reset expiration = %s, want %s", created.PasswordResetExpiresAt, now.Add(accountInviteTTL))
	}
	if notifier.notification.Recipient != created.Email {
		t.Fatalf("notification recipient = %q, want %q", notifier.notification.Recipient, created.Email)
	}
	if !strings.Contains(notifier.notification.ResetURL, "/login?reset_token=") {
		t.Fatalf("unexpected reset url: %q", notifier.notification.ResetURL)
	}
}

func TestCreateUserRejectsDuplicateEmail(t *testing.T) {
	ctx := context.Background()
	service := NewService(Deps{
		Users:  newFakeUsers(),
		Hasher: fakeHasher{},
		IDs:    &fakeIDs{},
		Clock:  fixedClock{t: time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)},
	})

	input := CreateUserInput{Email: "duplicate@example.com", Role: shared.RoleClient}
	if _, err := service.CreateUser(ctx, input); err != nil {
		t.Fatalf("first create: %v", err)
	}
	if _, err := service.CreateUser(ctx, input); !errors.Is(err, shared.ErrConflict) {
		t.Fatalf("second create: got %v, want ErrConflict", err)
	}
}
