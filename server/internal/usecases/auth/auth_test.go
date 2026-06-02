package auth

import (
	"context"
	"errors"
	"net/url"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/user"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
)

// --- лёгкие фейки портов ---------------------------------------------------

type fakeUsers struct {
	byID    map[string]user.User
	byEmail map[string]string
}

func newFakeUsers() *fakeUsers {
	return &fakeUsers{byID: map[string]user.User{}, byEmail: map[string]string{}}
}

func (f *fakeUsers) Create(_ context.Context, u user.User) error {
	if _, ok := f.byEmail[u.Email]; ok {
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
	id, ok := f.byEmail[email]
	if !ok {
		return user.User{}, shared.ErrNotFound
	}
	return f.byID[id], nil
}
func (f *fakeUsers) List(_ context.Context) ([]user.User, error) {
	items := make([]user.User, 0, len(f.byID))
	for _, u := range f.byID {
		items = append(items, u)
	}
	return items, nil
}
func (f *fakeUsers) Update(_ context.Context, u user.User) error {
	current, ok := f.byID[u.ID]
	if !ok {
		return shared.ErrNotFound
	}
	if ownerID, ok := f.byEmail[u.Email]; ok && ownerID != u.ID {
		return shared.ErrConflict
	}
	delete(f.byEmail, current.Email)
	f.byID[u.ID] = u
	f.byEmail[u.Email] = u.ID
	return nil
}

type fakeSessions struct{ m map[string]user.Session }

func newFakeSessions() *fakeSessions { return &fakeSessions{m: map[string]user.Session{}} }

func (f *fakeSessions) Create(_ context.Context, s user.Session) error { f.m[s.ID] = s; return nil }
func (f *fakeSessions) FindByID(_ context.Context, id string) (user.Session, error) {
	s, ok := f.m[id]
	if !ok {
		return user.Session{}, shared.ErrNotFound
	}
	return s, nil
}
func (f *fakeSessions) Revoke(_ context.Context, id string) error {
	s, ok := f.m[id]
	if !ok {
		return shared.ErrNotFound
	}
	now := time.Now()
	s.RevokedAt = &now
	f.m[id] = s
	return nil
}
func (f *fakeSessions) RevokeAllForUser(_ context.Context, userID string) error {
	now := time.Now()
	for id, session := range f.m {
		if session.UserID == userID {
			session.RevokedAt = &now
			f.m[id] = session
		}
	}
	return nil
}

type fakeHasher struct{}

func (fakeHasher) Hash(p string) (string, error) { return "h:" + p, nil }
func (fakeHasher) Compare(hash, p string) bool   { return hash == "h:"+p }

type fakeTokens struct{}

func (fakeTokens) Issue(userID, sessionID, role string) (string, error) {
	return strings.Join([]string{userID, sessionID, role}, "|"), nil
}
func (fakeTokens) Verify(token string) (port.TokenClaims, error) {
	parts := strings.Split(token, "|")
	if len(parts) != 3 {
		return port.TokenClaims{}, errors.New("bad token")
	}
	return port.TokenClaims{UserID: parts[0], SessionID: parts[1], Role: parts[2]}, nil
}

type fakeIDs struct{ n int }

func (f *fakeIDs) NewID() string { f.n++; return "id" + strconv.Itoa(f.n) }

type fixedClock struct{ t time.Time }

func (c fixedClock) Now() time.Time { return c.t }

type allowAll struct{}

func (allowAll) Allowed(string) bool { return true }
func (allowAll) Fail(string)         {}
func (allowAll) Reset(string)        {}

type fakePasswordResetNotifier struct {
	notification port.PasswordResetNotification
}

func (f *fakePasswordResetNotifier) SendPasswordReset(_ context.Context, notification port.PasswordResetNotification) error {
	f.notification = notification
	return nil
}

func newTestService() *Service {
	return NewService(Deps{
		Users:      newFakeUsers(),
		Sessions:   newFakeSessions(),
		Hasher:     fakeHasher{},
		Tokens:     fakeTokens{},
		IDs:        &fakeIDs{},
		Clock:      fixedClock{t: time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)},
		Limiter:    allowAll{},
		AccessTTL:  15 * time.Minute,
		RefreshTTL: time.Hour,
	})
}

// --- тесты -----------------------------------------------------------------

func newTestServiceWithPasswordResetNotifier(notifier port.PasswordResetNotifier) *Service {
	return NewService(Deps{
		Users:          newFakeUsers(),
		Sessions:       newFakeSessions(),
		Hasher:         fakeHasher{},
		Tokens:         fakeTokens{},
		IDs:            &fakeIDs{},
		Clock:          fixedClock{t: time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)},
		Limiter:        allowAll{},
		PasswordResets: notifier,
		FrontendURL:    "http://frontend.local",
		AccessTTL:      15 * time.Minute,
		RefreshTTL:     time.Hour,
	})
}

func TestRegisterLoginAuthenticateFlow(t *testing.T) {
	ctx := context.Background()
	svc := newTestService()

	in := RegisterInput{Email: "User@Example.com", Password: "secret-password", Name: "Иван", Surname: "Петров", Role: shared.RoleClient}
	if _, err := svc.Register(ctx, in); err != nil {
		t.Fatalf("register: %v", err)
	}

	// Повторная регистрация должна давать конфликт.
	if _, err := svc.Register(ctx, in); !errors.Is(err, shared.ErrConflict) {
		t.Fatalf("duplicate register: got %v, want ErrConflict", err)
	}

	result, err := svc.Login(ctx, LoginInput{Email: "user@example.com", Password: "secret-password"})
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	if result.AccessToken == "" {
		t.Fatal("expected a non-empty access token")
	}

	identity, err := svc.Authenticate(ctx, result.AccessToken)
	if err != nil {
		t.Fatalf("authenticate: %v", err)
	}
	if identity.Role != shared.RoleClient {
		t.Errorf("identity role = %q, want client", identity.Role)
	}

	// После выхода токен не должен больше аутентифицировать.
	if err := svc.Logout(ctx, identity.SessionID); err != nil {
		t.Fatalf("logout: %v", err)
	}
	if _, err := svc.Authenticate(ctx, result.AccessToken); !errors.Is(err, shared.ErrUnauthorized) {
		t.Errorf("authenticate after logout: got %v, want ErrUnauthorized", err)
	}
}

func TestLoginWrongPasswordUnauthorized(t *testing.T) {
	ctx := context.Background()
	svc := newTestService()
	_, _ = svc.Register(ctx, RegisterInput{Email: "a@b.com", Password: "secret-password", Name: "A", Surname: "B", Role: shared.RoleClient})

	if _, err := svc.Login(ctx, LoginInput{Email: "a@b.com", Password: "wrong-password"}); !errors.Is(err, shared.ErrUnauthorized) {
		t.Errorf("login wrong password: got %v, want ErrUnauthorized", err)
	}
}

func TestRegisterValidation(t *testing.T) {
	ctx := context.Background()
	svc := newTestService()

	cases := map[string]RegisterInput{
		"short password": {Email: "a@b.com", Password: "short", Name: "A", Surname: "B", Role: shared.RoleClient},
		"bad email":      {Email: "not-an-email", Password: "secret-password", Name: "A", Surname: "B", Role: shared.RoleClient},
		"bad role":       {Email: "a@b.com", Password: "secret-password", Name: "A", Surname: "B", Role: shared.RoleGuest},
	}
	for name, in := range cases {
		if _, err := svc.Register(ctx, in); !errors.Is(err, shared.ErrValidation) {
			t.Errorf("%s: got %v, want ErrValidation", name, err)
		}
	}
}

func TestUpdateProfilePersistsEditableFields(t *testing.T) {
	ctx := context.Background()
	svc := newTestService()

	view, err := svc.Register(ctx, RegisterInput{
		Email:      "profile@example.com",
		Password:   "secret-password",
		Name:       "Ivan",
		Surname:    "Petrov",
		Patronymic: "Sergeevich",
		About:      "initial profile",
		Experience: "5",
		Role:       shared.RoleSpecialist,
	})
	if err != nil {
		t.Fatalf("register: %v", err)
	}

	updated, err := svc.UpdateProfile(ctx, view.ID, UpdateProfileInput{
		Email:      "New.Profile@example.com",
		Name:       "Petr",
		Surname:    "Ivanov",
		Patronymic: "Alexeevich",
		About:      "updated profile",
		Experience: "8",
	})
	if err != nil {
		t.Fatalf("update profile: %v", err)
	}
	if updated.Email != "new.profile@example.com" {
		t.Fatalf("email = %q, want normalized email", updated.Email)
	}
	if updated.Name != "Petr" || updated.Surname != "Ivanov" || updated.Patronymic != "Alexeevich" {
		t.Fatalf("unexpected profile names: %+v", updated)
	}
	if updated.About != "updated profile" || updated.Experience != "8" {
		t.Fatalf("unexpected profile details: %+v", updated)
	}
}

func TestUpdateProfileRejectsDuplicateEmail(t *testing.T) {
	ctx := context.Background()
	svc := newTestService()

	first, err := svc.Register(ctx, RegisterInput{Email: "first@example.com", Password: "secret-password", Name: "First", Surname: "User", Role: shared.RoleClient})
	if err != nil {
		t.Fatalf("register first: %v", err)
	}
	second, err := svc.Register(ctx, RegisterInput{Email: "second@example.com", Password: "secret-password", Name: "Second", Surname: "User", Role: shared.RoleClient})
	if err != nil {
		t.Fatalf("register second: %v", err)
	}

	err = nil
	_, err = svc.UpdateProfile(ctx, second.ID, UpdateProfileInput{
		Email:      first.Email,
		Name:       "Second",
		Surname:    "User",
		Patronymic: "",
		About:      "",
	})
	if !errors.Is(err, shared.ErrConflict) {
		t.Fatalf("duplicate email update: got %v, want ErrConflict", err)
	}
}

func TestChangePasswordUpdatesLoginCredentials(t *testing.T) {
	ctx := context.Background()
	svc := newTestService()

	view, err := svc.Register(ctx, RegisterInput{Email: "change@example.com", Password: "old-password", Name: "Change", Surname: "User", Role: shared.RoleClient})
	if err != nil {
		t.Fatalf("register: %v", err)
	}

	if err := svc.ChangePassword(ctx, view.ID, ChangePasswordInput{CurrentPassword: "old-password", NewPassword: "new-password"}); err != nil {
		t.Fatalf("change password: %v", err)
	}
	if _, err := svc.Login(ctx, LoginInput{Email: "change@example.com", Password: "old-password"}); !errors.Is(err, shared.ErrUnauthorized) {
		t.Fatalf("login with old password: got %v, want ErrUnauthorized", err)
	}
	if _, err := svc.Login(ctx, LoginInput{Email: "change@example.com", Password: "new-password"}); err != nil {
		t.Fatalf("login with new password: %v", err)
	}
}

func TestChangePasswordRejectsWrongCurrentPassword(t *testing.T) {
	ctx := context.Background()
	svc := newTestService()

	view, err := svc.Register(ctx, RegisterInput{Email: "wrong-current@example.com", Password: "old-password", Name: "Change", Surname: "User", Role: shared.RoleClient})
	if err != nil {
		t.Fatalf("register: %v", err)
	}

	err = svc.ChangePassword(ctx, view.ID, ChangePasswordInput{CurrentPassword: "bad-password", NewPassword: "new-password"})
	if !errors.Is(err, shared.ErrUnauthorized) {
		t.Fatalf("change password with wrong current password: got %v, want ErrUnauthorized", err)
	}
}

func TestPasswordResetUpdatesLoginCredentials(t *testing.T) {
	ctx := context.Background()
	notifier := &fakePasswordResetNotifier{}
	svc := newTestServiceWithPasswordResetNotifier(notifier)

	if _, err := svc.Register(ctx, RegisterInput{Email: "reset@example.com", Password: "old-password", Name: "Reset", Surname: "User", Role: shared.RoleClient}); err != nil {
		t.Fatalf("register: %v", err)
	}
	if _, err := svc.Login(ctx, LoginInput{Email: "reset@example.com", Password: "old-password"}); err != nil {
		t.Fatalf("login before reset: %v", err)
	}

	if err := svc.RequestPasswordReset(ctx, RequestPasswordResetInput{Email: "reset@example.com"}); err != nil {
		t.Fatalf("request reset: %v", err)
	}
	if notifier.notification.ResetURL == "" {
		t.Fatal("expected reset link to be sent")
	}

	link, err := url.Parse(notifier.notification.ResetURL)
	if err != nil {
		t.Fatalf("parse reset link: %v", err)
	}
	token := link.Query().Get("reset_token")
	if token == "" {
		t.Fatal("expected reset_token in reset link")
	}

	if err := svc.ConfirmPasswordReset(ctx, ConfirmPasswordResetInput{Token: token, NewPassword: "new-password"}); err != nil {
		t.Fatalf("confirm reset: %v", err)
	}
	if _, err := svc.Login(ctx, LoginInput{Email: "reset@example.com", Password: "old-password"}); !errors.Is(err, shared.ErrUnauthorized) {
		t.Fatalf("login with old password: got %v, want ErrUnauthorized", err)
	}
	if _, err := svc.Login(ctx, LoginInput{Email: "reset@example.com", Password: "new-password"}); err != nil {
		t.Fatalf("login with new password: %v", err)
	}
	if err := svc.ConfirmPasswordReset(ctx, ConfirmPasswordResetInput{Token: token, NewPassword: "another-password"}); !errors.Is(err, shared.ErrUnauthorized) {
		t.Fatalf("reuse reset token: got %v, want ErrUnauthorized", err)
	}
}

func TestPasswordResetDoesNotRevealMissingEmail(t *testing.T) {
	ctx := context.Background()
	notifier := &fakePasswordResetNotifier{}
	svc := newTestServiceWithPasswordResetNotifier(notifier)

	if err := svc.RequestPasswordReset(ctx, RequestPasswordResetInput{Email: "missing@example.com"}); err != nil {
		t.Fatalf("request reset for missing email: %v", err)
	}
	if notifier.notification.ResetURL != "" {
		t.Fatal("did not expect reset link for missing email")
	}
}

func TestDeleteAccountRevokesSessions(t *testing.T) {
	ctx := context.Background()
	svc := newTestService()

	_, err := svc.Register(ctx, RegisterInput{Email: "delete@example.com", Password: "secret-password", Name: "Delete", Surname: "User", Role: shared.RoleClient})
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	result, err := svc.Login(ctx, LoginInput{Email: "delete@example.com", Password: "secret-password"})
	if err != nil {
		t.Fatalf("login: %v", err)
	}

	if err := svc.DeleteAccount(ctx, result.User.ID); err != nil {
		t.Fatalf("delete account: %v", err)
	}
	if _, err := svc.Authenticate(ctx, result.AccessToken); !errors.Is(err, shared.ErrUnauthorized) {
		t.Fatalf("authenticate after delete: got %v, want ErrUnauthorized", err)
	}
}

type fakeOAuth struct {
	configured bool
	identity   port.OAuthIdentity
}

func (f fakeOAuth) Configured() bool { return f.configured }
func (f fakeOAuth) AuthCodeURL(state string) string {
	return "https://provider/authorize?state=" + state
}
func (f fakeOAuth) Exchange(context.Context, string) (port.OAuthIdentity, error) {
	return f.identity, nil
}

func newTestServiceWithOAuth(provider port.OAuthProvider) *Service {
	return NewService(Deps{
		Users:      newFakeUsers(),
		Sessions:   newFakeSessions(),
		Hasher:     fakeHasher{},
		Tokens:     fakeTokens{},
		IDs:        &fakeIDs{},
		Clock:      fixedClock{t: time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)},
		Limiter:    allowAll{},
		OAuth:      provider,
		AccessTTL:  15 * time.Minute,
		RefreshTTL: time.Hour,
	})
}

func TestOAuthCallbackCreatesAndLinksClient(t *testing.T) {
	ctx := context.Background()
	svc := newTestServiceWithOAuth(fakeOAuth{
		configured: true,
		identity:   port.OAuthIdentity{Email: "New.User@Yandex.RU", Name: "Иван", Surname: "Петров"},
	})

	result, err := svc.OAuthCallback(ctx, "auth-code", "agent", "127.0.0.1")
	if err != nil {
		t.Fatalf("oauth callback: %v", err)
	}
	if result.AccessToken == "" {
		t.Fatal("expected a non-empty access token")
	}
	if result.User.Email != "new.user@yandex.ru" {
		t.Errorf("email = %q, want normalized new.user@yandex.ru", result.User.Email)
	}
	if !result.User.YandexLinked {
		t.Error("expected YandexLinked to be true")
	}
	if result.User.Role != shared.RoleClient {
		t.Errorf("role = %q, want client", result.User.Role)
	}

	// Выданный токен должен аутентифицировать.
	if _, err := svc.Authenticate(ctx, result.AccessToken); err != nil {
		t.Errorf("authenticate after oauth: %v", err)
	}

	// Повторный вход тем же провайдером находит того же пользователя (без конфликта).
	if _, err := svc.OAuthCallback(ctx, "auth-code", "agent", "127.0.0.1"); err != nil {
		t.Errorf("second oauth callback: %v", err)
	}
}

func TestOAuthLinkCallbackLinksExistingUser(t *testing.T) {
	ctx := context.Background()
	svc := newTestServiceWithOAuth(fakeOAuth{
		configured: true,
		identity:   port.OAuthIdentity{Email: "link@example.com"},
	})

	view, err := svc.Register(ctx, RegisterInput{Email: "link@example.com", Password: "secret-password", Name: "Link", Surname: "User", Role: shared.RoleClient})
	if err != nil {
		t.Fatalf("register: %v", err)
	}

	linked, err := svc.OAuthLinkCallback(ctx, view.ID, "auth-code")
	if err != nil {
		t.Fatalf("oauth link: %v", err)
	}
	if !linked.YandexLinked {
		t.Fatal("expected YandexLinked to be true")
	}
}

func TestOAuthLinkCallbackRejectsDifferentEmail(t *testing.T) {
	ctx := context.Background()
	svc := newTestServiceWithOAuth(fakeOAuth{
		configured: true,
		identity:   port.OAuthIdentity{Email: "other@example.com"},
	})

	view, err := svc.Register(ctx, RegisterInput{Email: "link@example.com", Password: "secret-password", Name: "Link", Surname: "User", Role: shared.RoleClient})
	if err != nil {
		t.Fatalf("register: %v", err)
	}

	if _, err := svc.OAuthLinkCallback(ctx, view.ID, "auth-code"); !errors.Is(err, shared.ErrValidation) {
		t.Fatalf("oauth link with different email: got %v, want ErrValidation", err)
	}
}

func TestUnlinkYandexPersists(t *testing.T) {
	ctx := context.Background()
	svc := newTestServiceWithOAuth(fakeOAuth{
		configured: true,
		identity:   port.OAuthIdentity{Email: "unlink@example.com"},
	})

	result, err := svc.OAuthCallback(ctx, "auth-code", "", "")
	if err != nil {
		t.Fatalf("oauth callback: %v", err)
	}

	view, err := svc.UnlinkYandex(ctx, result.User.ID)
	if err != nil {
		t.Fatalf("unlink yandex: %v", err)
	}
	if view.YandexLinked {
		t.Fatal("expected YandexLinked to be false")
	}
}

func TestOAuthCallbackNotConfigured(t *testing.T) {
	// Сервис без провайдера (как при отсутствии секретов) должен отказывать.
	if _, err := newTestService().OAuthCallback(context.Background(), "code", "", ""); !errors.Is(err, shared.ErrForbidden) {
		t.Errorf("got %v, want ErrForbidden", err)
	}
	// Провайдер есть, но не настроен — тоже отказ.
	svc := newTestServiceWithOAuth(fakeOAuth{configured: false})
	if _, err := svc.OAuthLoginURL("state"); !errors.Is(err, shared.ErrForbidden) {
		t.Errorf("login url: got %v, want ErrForbidden", err)
	}
}
