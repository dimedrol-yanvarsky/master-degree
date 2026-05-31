// Пакет auth реализует use case обработки учётных записей (ТЗ §5.1.1) и
// технологию разграничения доступа (ТЗ часть 3): регистрацию, вход по паролю,
// выход, аутентификацию запроса, ограничение перебора и управление сессиями.
package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/application/port"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/user"
)

const minPasswordLength = 8

// RegisterInput — данные для создания аккаунта.
type RegisterInput struct {
	Email      string
	Password   string
	Name       string
	Surname    string
	Patronymic string
	About      string
	Role       shared.Role
}

// LoginInput — данные для входа по паролю.
type LoginInput struct {
	Email     string
	Password  string
	UserAgent string
	IP        string
}

// UserView — безопасная проекция пользователя (без хеша пароля).
type UserView struct {
	ID           string
	Email        string
	Name         string
	Surname      string
	Patronymic   string
	About        string
	Role         shared.Role
	Status       shared.AccountStatus
	YandexLinked bool
}

// LoginResult возвращается при успешном входе.
type LoginResult struct {
	AccessToken string
	ExpiresAt   time.Time
	User        UserView
}

// Identity — аутентифицированный вызывающий, восстановленный из токена доступа.
type Identity struct {
	UserID    string
	SessionID string
	Role      shared.Role
}

// Deps группирует порты, от которых зависит сервис.
type Deps struct {
	Users      port.UserRepository
	Sessions   port.SessionRepository
	Hasher     port.PasswordHasher
	Tokens     port.TokenIssuer
	IDs        port.IDGenerator
	Clock      port.Clock
	Limiter    port.AttemptLimiter
	OAuth      port.OAuthProvider // опционально: внешний вход (Yandex)
	AccessTTL  time.Duration
	RefreshTTL time.Duration
}

// Service реализует use case аутентификации и аккаунтов.
type Service struct {
	deps Deps
}

// NewService собирает сервис auth с его зависимостями.
func NewService(deps Deps) *Service {
	return &Service{deps: deps}
}

// Register создаёт новый аккаунт клиента или специалиста.
func (s *Service) Register(ctx context.Context, in RegisterInput) (UserView, error) {
	email := normalizeEmail(in.Email)
	if err := validateRegister(in, email); err != nil {
		return UserView{}, err
	}

	if _, err := s.deps.Users.FindByEmail(ctx, email); err == nil {
		return UserView{}, fmt.Errorf("%w: email already registered", shared.ErrConflict)
	} else if !errors.Is(err, shared.ErrNotFound) {
		return UserView{}, err
	}

	hash, err := s.deps.Hasher.Hash(in.Password)
	if err != nil {
		return UserView{}, err
	}

	u := user.User{
		ID:           s.deps.IDs.NewID(),
		Email:        email,
		Name:         strings.TrimSpace(in.Name),
		Surname:      strings.TrimSpace(in.Surname),
		Patronymic:   strings.TrimSpace(in.Patronymic),
		About:        strings.TrimSpace(in.About),
		PasswordHash: hash,
		Role:         in.Role,
		Status:       shared.AccountActive,
		CreatedAt:    s.deps.Clock.Now(),
	}
	if err := s.deps.Users.Create(ctx, u); err != nil {
		return UserView{}, err
	}

	return toView(u), nil
}

// Login проверяет учётные данные, создаёт сессию и выпускает токен доступа.
func (s *Service) Login(ctx context.Context, in LoginInput) (LoginResult, error) {
	email := normalizeEmail(in.Email)
	if !s.deps.Limiter.Allowed(email) {
		return LoginResult{}, fmt.Errorf("%w: too many login attempts", shared.ErrForbidden)
	}

	u, err := s.deps.Users.FindByEmail(ctx, email)
	if errors.Is(err, shared.ErrNotFound) {
		s.deps.Limiter.Fail(email)
		return LoginResult{}, shared.ErrUnauthorized // не раскрываем, существует ли email
	} else if err != nil {
		return LoginResult{}, err
	}

	if !u.Status.CanAuthenticate() {
		return LoginResult{}, shared.ErrForbidden
	}

	if !s.deps.Hasher.Compare(u.PasswordHash, in.Password) {
		s.deps.Limiter.Fail(email)
		return LoginResult{}, shared.ErrUnauthorized
	}
	s.deps.Limiter.Reset(email)

	now := s.deps.Clock.Now()
	sessionID := s.deps.IDs.NewID()

	token, err := s.deps.Tokens.Issue(u.ID, sessionID, string(u.Role))
	if err != nil {
		return LoginResult{}, err
	}

	session := user.Session{
		ID:        sessionID,
		UserID:    u.ID,
		TokenHash: hashToken(token),
		UserAgent: in.UserAgent,
		IP:        in.IP,
		CreatedAt: now,
		ExpiresAt: now.Add(s.deps.RefreshTTL),
	}
	if err := s.deps.Sessions.Create(ctx, session); err != nil {
		return LoginResult{}, err
	}

	return LoginResult{
		AccessToken: token,
		ExpiresAt:   now.Add(s.deps.AccessTTL),
		User:        toView(u),
	}, nil
}

// OAuthLoginURL возвращает ссылку на страницу согласия внешнего провайдера.
// state передаётся для защиты от CSRF (проверяется HTTP-слоем).
func (s *Service) OAuthLoginURL(state string) (string, error) {
	if s.deps.OAuth == nil || !s.deps.OAuth.Configured() {
		return "", fmt.Errorf("%w: oauth provider is not configured", shared.ErrForbidden)
	}
	return s.deps.OAuth.AuthCodeURL(state), nil
}

// OAuthCallback завершает внешний вход: меняет код на профиль, находит или
// создаёт аккаунт (клиент, привязанный к Яндексу), и выдаёт сессию/токен.
func (s *Service) OAuthCallback(ctx context.Context, code, userAgent, ip string) (LoginResult, error) {
	if s.deps.OAuth == nil || !s.deps.OAuth.Configured() {
		return LoginResult{}, fmt.Errorf("%w: oauth provider is not configured", shared.ErrForbidden)
	}

	external, err := s.deps.OAuth.Exchange(ctx, code)
	if err != nil {
		return LoginResult{}, err
	}

	email := normalizeEmail(external.Email)
	if email == "" {
		return LoginResult{}, fmt.Errorf("%w: oauth provider returned no email", shared.ErrValidation)
	}

	u, err := s.deps.Users.FindByEmail(ctx, email)
	switch {
	case errors.Is(err, shared.ErrNotFound):
		// Нового пользователя заводим как клиента с непригодным паролем —
		// вход возможен только через провайдера.
		hash, hashErr := s.deps.Hasher.Hash(s.deps.IDs.NewID())
		if hashErr != nil {
			return LoginResult{}, hashErr
		}
		u = user.User{
			ID:           s.deps.IDs.NewID(),
			Email:        email,
			Name:         strings.TrimSpace(external.Name),
			Surname:      strings.TrimSpace(external.Surname),
			PasswordHash: hash,
			Role:         shared.RoleClient,
			Status:       shared.AccountActive,
			YandexLinked: true,
			CreatedAt:    s.deps.Clock.Now(),
		}
		if createErr := s.deps.Users.Create(ctx, u); createErr != nil {
			return LoginResult{}, createErr
		}
	case err != nil:
		return LoginResult{}, err
	default:
		if !u.Status.CanAuthenticate() {
			return LoginResult{}, shared.ErrForbidden
		}
		if !u.YandexLinked {
			u.YandexLinked = true
			if updateErr := s.deps.Users.Update(ctx, u); updateErr != nil {
				return LoginResult{}, updateErr
			}
		}
	}

	return s.issueSession(ctx, u, userAgent, ip)
}

// issueSession создаёт сессию и выпускает токен доступа для уже проверенного
// пользователя (общая часть входа по паролю и через OAuth).
func (s *Service) issueSession(ctx context.Context, u user.User, userAgent, ip string) (LoginResult, error) {
	now := s.deps.Clock.Now()
	sessionID := s.deps.IDs.NewID()

	token, err := s.deps.Tokens.Issue(u.ID, sessionID, string(u.Role))
	if err != nil {
		return LoginResult{}, err
	}

	session := user.Session{
		ID:        sessionID,
		UserID:    u.ID,
		TokenHash: hashToken(token),
		UserAgent: userAgent,
		IP:        ip,
		CreatedAt: now,
		ExpiresAt: now.Add(s.deps.RefreshTTL),
	}
	if err := s.deps.Sessions.Create(ctx, session); err != nil {
		return LoginResult{}, err
	}

	return LoginResult{
		AccessToken: token,
		ExpiresAt:   now.Add(s.deps.AccessTTL),
		User:        toView(u),
	}, nil
}

// Authenticate восстанавливает личность по токену доступа. Все проверки заново
// сверяются с хранилищем, поэтому отозванные или заблокированные аккаунты
// теряют доступ немедленно (РПЗ §3.2–3.3).
func (s *Service) Authenticate(ctx context.Context, token string) (Identity, error) {
	claims, err := s.deps.Tokens.Verify(token)
	if err != nil {
		return Identity{}, shared.ErrUnauthorized
	}

	session, err := s.deps.Sessions.FindByID(ctx, claims.SessionID)
	if errors.Is(err, shared.ErrNotFound) {
		return Identity{}, shared.ErrUnauthorized
	} else if err != nil {
		return Identity{}, err
	}
	if !session.Active(s.deps.Clock.Now()) {
		return Identity{}, shared.ErrUnauthorized
	}

	u, err := s.deps.Users.FindByID(ctx, claims.UserID)
	if errors.Is(err, shared.ErrNotFound) {
		return Identity{}, shared.ErrUnauthorized
	} else if err != nil {
		return Identity{}, err
	}
	if !u.Status.CanAuthenticate() {
		return Identity{}, shared.ErrForbidden
	}

	return Identity{UserID: u.ID, SessionID: session.ID, Role: u.Role}, nil
}

// Logout отзывает указанную сессию.
func (s *Service) Logout(ctx context.Context, sessionID string) error {
	return s.deps.Sessions.Revoke(ctx, sessionID)
}

// Profile возвращает безопасную проекцию пользователя по id.
func (s *Service) Profile(ctx context.Context, userID string) (UserView, error) {
	u, err := s.deps.Users.FindByID(ctx, userID)
	if err != nil {
		return UserView{}, err
	}
	return toView(u), nil
}

func validateRegister(in RegisterInput, email string) error {
	if _, err := mail.ParseAddress(email); err != nil {
		return fmt.Errorf("%w: invalid email", shared.ErrValidation)
	}
	if len(in.Password) < minPasswordLength {
		return fmt.Errorf("%w: password must be at least %d characters", shared.ErrValidation, minPasswordLength)
	}
	if strings.TrimSpace(in.Name) == "" || strings.TrimSpace(in.Surname) == "" {
		return fmt.Errorf("%w: name and surname are required", shared.ErrValidation)
	}
	if !in.Role.Assignable() {
		return fmt.Errorf("%w: role must be client or specialist", shared.ErrValidation)
	}
	return nil
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func toView(u user.User) UserView {
	return UserView{
		ID:           u.ID,
		Email:        u.Email,
		Name:         u.Name,
		Surname:      u.Surname,
		Patronymic:   u.Patronymic,
		About:        u.About,
		Role:         u.Role,
		Status:       u.Status,
		YandexLinked: u.YandexLinked,
	}
}
