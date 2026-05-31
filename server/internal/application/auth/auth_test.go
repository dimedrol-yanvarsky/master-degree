package auth

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/application/port"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/user"
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
func (f *fakeUsers) Update(_ context.Context, u user.User) error {
	f.byID[u.ID] = u
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
func (f *fakeSessions) RevokeAllForUser(context.Context, string) error { return nil }

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

type fakeOAuth struct {
	configured bool
	identity   port.OAuthIdentity
}

func (f fakeOAuth) Configured() bool                { return f.configured }
func (f fakeOAuth) AuthCodeURL(state string) string { return "https://provider/authorize?state=" + state }
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
