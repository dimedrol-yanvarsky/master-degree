// Пакет auth реализует use case обработки учётных записей (ТЗ §5.1.1) и
// технологию разграничения доступа (ТЗ часть 3): регистрацию, вход по паролю,
// выход, аутентификацию запроса, ограничение перебора и управление сессиями.
package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"net/mail"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/user"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
)

const (
	minPasswordLength = 8
	passwordResetTTL  = 30 * time.Minute
)

// RegisterInput — данные для создания аккаунта.
type RegisterInput struct {
	Email      string
	Password   string
	Name       string
	Surname    string
	Patronymic string
	About      string
	Experience string
	Role       shared.Role
}

// LoginInput — данные для входа по паролю.
type LoginInput struct {
	Email     string
	Password  string
	UserAgent string
	IP        string
}

// UpdateProfileInput — данные, которые пользователь может менять в собственном профиле.
type UpdateProfileInput struct {
	Email      string
	Name       string
	Surname    string
	Patronymic string
	About      string
	Experience string
}

// ChangePasswordInput — данные для смены пароля текущего пользователя.
type ChangePasswordInput struct {
	CurrentPassword string
	NewPassword     string
}

// RequestPasswordResetInput — данные для запроса восстановления пароля.
type RequestPasswordResetInput struct {
	Email string
}

// ConfirmPasswordResetInput — данные для подтверждения восстановления пароля.
type ConfirmPasswordResetInput struct {
	Token       string
	NewPassword string
}

// UserView — безопасная проекция пользователя (без хеша пароля).
type UserView struct {
	ID           string
	Email        string
	Name         string
	Surname      string
	Patronymic   string
	About        string
	Experience   string
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
	Users          port.UserRepository
	Sessions       port.SessionRepository
	Hasher         port.PasswordHasher
	Tokens         port.TokenIssuer
	IDs            port.IDGenerator
	Clock          port.Clock
	Limiter        port.AttemptLimiter
	OAuth          port.OAuthProvider // опционально: внешний вход (Yandex)
	PasswordResets port.PasswordResetNotifier
	FrontendURL    string
	AccessTTL      time.Duration
	RefreshTTL     time.Duration
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
		Experience:   normalizeExperience(in.Experience),
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
		if !legacyPlainPasswordMatches(u.PasswordHash, in.Password) {
			s.deps.Limiter.Fail(email)
			return LoginResult{}, shared.ErrUnauthorized
		}
		hash, err := s.deps.Hasher.Hash(in.Password)
		if err != nil {
			return LoginResult{}, err
		}
		u.PasswordHash = hash
		if err := s.deps.Users.Update(ctx, u); err != nil {
			return LoginResult{}, err
		}
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

func legacyPlainPasswordMatches(stored, password string) bool {
	return stored != "" && password != "" && stored == password
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

// OAuthLinkCallback завершает привязку Yandex к уже существующей учётной записи.
func (s *Service) OAuthLinkCallback(ctx context.Context, userID, code string) (UserView, error) {
	if s.deps.OAuth == nil || !s.deps.OAuth.Configured() {
		return UserView{}, fmt.Errorf("%w: oauth provider is not configured", shared.ErrForbidden)
	}

	external, err := s.deps.OAuth.Exchange(ctx, code)
	if err != nil {
		return UserView{}, err
	}

	email := normalizeEmail(external.Email)
	if email == "" {
		return UserView{}, fmt.Errorf("%w: oauth provider returned no email", shared.ErrValidation)
	}

	u, err := s.deps.Users.FindByID(ctx, userID)
	if err != nil {
		return UserView{}, err
	}
	if !u.Status.CanAuthenticate() {
		return UserView{}, shared.ErrForbidden
	}
	if email != u.Email {
		return UserView{}, fmt.Errorf("%w: yandex email must match account email", shared.ErrValidation)
	}

	if !u.YandexLinked {
		u.YandexLinked = true
		if err := s.deps.Users.Update(ctx, u); err != nil {
			return UserView{}, err
		}
	}

	return toView(u), nil
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
	// Сессия должна быть активна (не отозвана и не истекла) И предъявленный токен —
	// именно тот, что был выпущен для неё: его хеш совпадает с сохранённым. Поэтому
	// устаревшие и подменённые токены отклоняются, даже если подпись валидна
	// (РПЗ §3.2–3.3).
	if !session.Authorizes(hashToken(token), s.deps.Clock.Now()) {
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

// UpdateProfile сохраняет редактируемые пользователем поля собственного профиля.
func (s *Service) UpdateProfile(ctx context.Context, userID string, in UpdateProfileInput) (UserView, error) {
	u, err := s.deps.Users.FindByID(ctx, userID)
	if err != nil {
		return UserView{}, err
	}

	email := normalizeEmail(in.Email)
	if err := validateProfileUpdate(in, email, u.Role); err != nil {
		return UserView{}, err
	}

	if email != u.Email {
		existing, err := s.deps.Users.FindByEmail(ctx, email)
		if err == nil && existing.ID != u.ID {
			return UserView{}, fmt.Errorf("%w: email already registered", shared.ErrConflict)
		}
		if err != nil && !errors.Is(err, shared.ErrNotFound) {
			return UserView{}, err
		}
	}

	u.Email = email
	u.Name = strings.TrimSpace(in.Name)
	u.Surname = strings.TrimSpace(in.Surname)
	u.Patronymic = strings.TrimSpace(in.Patronymic)
	u.About = strings.TrimSpace(in.About)
	if u.Role == shared.RoleSpecialist {
		u.Experience = normalizeExperience(in.Experience)
	} else {
		u.Experience = ""
	}

	if err := s.deps.Users.Update(ctx, u); err != nil {
		return UserView{}, err
	}

	return toView(u), nil
}

// ChangePassword меняет пароль текущего пользователя после проверки старого пароля.
func (s *Service) ChangePassword(ctx context.Context, userID string, in ChangePasswordInput) error {
	u, err := s.deps.Users.FindByID(ctx, userID)
	if err != nil {
		return err
	}
	if !u.Status.CanAuthenticate() {
		return shared.ErrForbidden
	}
	if in.CurrentPassword == "" {
		return fmt.Errorf("%w: current password is required", shared.ErrValidation)
	}
	if err := validatePassword(in.NewPassword); err != nil {
		return err
	}
	if !s.deps.Hasher.Compare(u.PasswordHash, in.CurrentPassword) && !legacyPlainPasswordMatches(u.PasswordHash, in.CurrentPassword) {
		return shared.ErrUnauthorized
	}

	hash, err := s.deps.Hasher.Hash(in.NewPassword)
	if err != nil {
		return err
	}
	u.PasswordHash = hash
	u.PasswordResetTokenHash = ""
	u.PasswordResetExpiresAt = nil
	if err := s.deps.Users.Update(ctx, u); err != nil {
		return err
	}
	// Смена пароля завершает все активные сессии: ранее выданные токены становятся
	// недействительными, и пользователь проходит авторизацию повторно (РПЗ §3.5).
	if err := s.deps.Sessions.RevokeAllForUser(ctx, userID); err != nil && !errors.Is(err, shared.ErrNotFound) {
		return err
	}
	return nil
}

// RequestPasswordReset создаёт короткоживущий одноразовый токен и отправляет ссылку сброса.
func (s *Service) RequestPasswordReset(ctx context.Context, in RequestPasswordResetInput) error {
	email := normalizeEmail(in.Email)
	if _, err := mail.ParseAddress(email); err != nil {
		return fmt.Errorf("%w: invalid email", shared.ErrValidation)
	}

	u, err := s.deps.Users.FindByEmail(ctx, email)
	if errors.Is(err, shared.ErrNotFound) {
		return nil
	}
	if err != nil {
		return err
	}
	if !u.Status.CanAuthenticate() {
		return nil
	}

	token, err := randomPasswordResetToken()
	if err != nil {
		return err
	}

	expiresAt := s.deps.Clock.Now().Add(passwordResetTTL)
	u.PasswordResetTokenHash = hashToken(token)
	u.PasswordResetExpiresAt = &expiresAt
	if err := s.deps.Users.Update(ctx, u); err != nil {
		return err
	}

	if s.deps.PasswordResets == nil {
		return nil
	}

	return s.deps.PasswordResets.SendPasswordReset(ctx, port.PasswordResetNotification{
		Recipient: u.Email,
		Name:      displayName(u),
		ResetURL:  buildPasswordResetURL(s.deps.FrontendURL, token),
		ExpiresAt: expiresAt,
	})
}

// ConfirmPasswordReset проверяет одноразовый токен, сохраняет новый пароль и отзывает старые сессии.
func (s *Service) ConfirmPasswordReset(ctx context.Context, in ConfirmPasswordResetInput) error {
	token := strings.TrimSpace(in.Token)
	if token == "" {
		return fmt.Errorf("%w: reset token is required", shared.ErrValidation)
	}
	if err := validatePassword(in.NewPassword); err != nil {
		return err
	}

	u, err := s.findUserByPasswordResetToken(ctx, token)
	if err != nil {
		return err
	}
	if !u.Status.CanAuthenticate() {
		return shared.ErrForbidden
	}
	if u.PasswordResetExpiresAt == nil || !s.deps.Clock.Now().Before(*u.PasswordResetExpiresAt) {
		u.PasswordResetTokenHash = ""
		u.PasswordResetExpiresAt = nil
		_ = s.deps.Users.Update(ctx, u)
		return shared.ErrUnauthorized
	}

	hash, err := s.deps.Hasher.Hash(in.NewPassword)
	if err != nil {
		return err
	}
	u.PasswordHash = hash
	u.PasswordResetTokenHash = ""
	u.PasswordResetExpiresAt = nil
	if err := s.deps.Users.Update(ctx, u); err != nil {
		return err
	}
	if err := s.deps.Sessions.RevokeAllForUser(ctx, u.ID); err != nil && !errors.Is(err, shared.ErrNotFound) {
		return err
	}
	return nil
}

func (s *Service) findUserByPasswordResetToken(ctx context.Context, token string) (user.User, error) {
	tokenHash := hashToken(token)
	users, err := s.deps.Users.List(ctx)
	if err != nil {
		return user.User{}, err
	}
	for _, u := range users {
		if u.PasswordResetTokenHash == tokenHash {
			return u, nil
		}
	}
	return user.User{}, shared.ErrUnauthorized
}

// UnlinkYandex отвязывает Yandex от текущей учётной записи.
func (s *Service) UnlinkYandex(ctx context.Context, userID string) (UserView, error) {
	u, err := s.deps.Users.FindByID(ctx, userID)
	if err != nil {
		return UserView{}, err
	}
	if !u.Status.CanAuthenticate() {
		return UserView{}, shared.ErrForbidden
	}
	if u.YandexLinked {
		u.YandexLinked = false
		if err := s.deps.Users.Update(ctx, u); err != nil {
			return UserView{}, err
		}
	}
	return toView(u), nil
}

// DeleteAccount помечает текущую учётную запись удалённой и отзывает все её сессии.
func (s *Service) DeleteAccount(ctx context.Context, userID string) error {
	u, err := s.deps.Users.FindByID(ctx, userID)
	if err != nil {
		return err
	}
	if u.Status == shared.AccountDeleted {
		return nil
	}

	u.Status = shared.AccountDeleted
	if err := s.deps.Users.Update(ctx, u); err != nil {
		return err
	}
	if err := s.deps.Sessions.RevokeAllForUser(ctx, userID); err != nil && !errors.Is(err, shared.ErrNotFound) {
		return err
	}
	return nil
}

func validateRegister(in RegisterInput, email string) error {
	if _, err := mail.ParseAddress(email); err != nil {
		return fmt.Errorf("%w: invalid email", shared.ErrValidation)
	}
	if err := validatePassword(in.Password); err != nil {
		return err
	}
	if strings.TrimSpace(in.Name) == "" || strings.TrimSpace(in.Surname) == "" {
		return fmt.Errorf("%w: name and surname are required", shared.ErrValidation)
	}
	if !in.Role.Assignable() {
		return fmt.Errorf("%w: role must be client or specialist", shared.ErrValidation)
	}
	return nil
}

func validateProfileUpdate(in UpdateProfileInput, email string, role shared.Role) error {
	if _, err := mail.ParseAddress(email); err != nil {
		return fmt.Errorf("%w: invalid email", shared.ErrValidation)
	}
	if strings.TrimSpace(in.Name) == "" || strings.TrimSpace(in.Surname) == "" {
		return fmt.Errorf("%w: name and surname are required", shared.ErrValidation)
	}
	if len(strings.TrimSpace(in.About)) > 320 {
		return fmt.Errorf("%w: about must be at most 320 characters", shared.ErrValidation)
	}
	if role == shared.RoleSpecialist {
		experience := normalizeExperience(in.Experience)
		years, err := strconv.Atoi(experience)
		if experience == "" || err != nil || years < 1 || years > 80 {
			return fmt.Errorf("%w: experience must be an integer from 1 to 80", shared.ErrValidation)
		}
	}
	return nil
}

func validatePassword(password string) error {
	if len(password) < minPasswordLength {
		return fmt.Errorf("%w: password must be at least %d characters", shared.ErrValidation, minPasswordLength)
	}
	return nil
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func normalizeExperience(experience string) string {
	return strings.TrimSpace(experience)
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func randomPasswordResetToken() (string, error) {
	buffer := make([]byte, 32)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buffer), nil
}

func buildPasswordResetURL(frontendURL, token string) string {
	base := strings.TrimRight(strings.TrimSpace(frontendURL), "/")
	if base == "" {
		base = "http://localhost:3000"
	}
	return base + "/login?reset_token=" + url.QueryEscape(token)
}

func displayName(u user.User) string {
	parts := []string{u.Surname, u.Name, u.Patronymic}
	nonEmpty := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			nonEmpty = append(nonEmpty, trimmed)
		}
	}
	if len(nonEmpty) > 0 {
		return strings.Join(nonEmpty, " ")
	}
	return u.Email
}

func toView(u user.User) UserView {
	return UserView{
		ID:           u.ID,
		Email:        u.Email,
		Name:         u.Name,
		Surname:      u.Surname,
		Patronymic:   u.Patronymic,
		About:        u.About,
		Experience:   u.Experience,
		Role:         u.Role,
		Status:       u.Status,
		YandexLinked: u.YandexLinked,
	}
}
