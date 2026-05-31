package account

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
	"sort"
	"strings"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/application/port"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/user"
)

const accountInviteTTL = 24 * time.Hour

type CreateUserInput struct {
	Email      string
	Name       string
	Surname    string
	Patronymic string
	Role       shared.Role
}

type Deps struct {
	Users          port.UserRepository
	Hasher         port.PasswordHasher
	IDs            port.IDGenerator
	Clock          port.Clock
	PasswordResets port.PasswordResetNotifier
	FrontendURL    string
}

type Service struct {
	deps Deps
}

func NewService(deps Deps) *Service {
	return &Service{deps: deps}
}

func (s *Service) ListUsers(ctx context.Context) ([]user.User, error) {
	if s.deps.Users == nil {
		return []user.User{}, nil
	}
	items, err := s.deps.Users.List(ctx)
	if err != nil {
		return nil, err
	}
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].CreatedAt.Equal(items[j].CreatedAt) {
			return items[i].Email < items[j].Email
		}
		return items[i].CreatedAt.After(items[j].CreatedAt)
	})
	return items, nil
}

func (s *Service) CreateUser(ctx context.Context, in CreateUserInput) (user.User, error) {
	if s.deps.Users == nil {
		return user.User{}, shared.ErrNotFound
	}
	email := normalizeEmail(in.Email)
	if _, err := mail.ParseAddress(email); err != nil {
		return user.User{}, fmt.Errorf("%w: invalid email", shared.ErrValidation)
	}
	if !in.Role.Assignable() {
		return user.User{}, fmt.Errorf("%w: unsupported role", shared.ErrValidation)
	}
	if _, err := s.deps.Users.FindByEmail(ctx, email); err == nil {
		return user.User{}, fmt.Errorf("%w: email already registered", shared.ErrConflict)
	} else if err != nil && !errors.Is(err, shared.ErrNotFound) {
		return user.User{}, err
	}

	password, err := randomSecret()
	if err != nil {
		return user.User{}, err
	}
	passwordHash, err := s.deps.Hasher.Hash(password)
	if err != nil {
		return user.User{}, err
	}
	resetToken, err := randomSecret()
	if err != nil {
		return user.User{}, err
	}

	now := s.deps.Clock.Now()
	expiresAt := now.Add(accountInviteTTL)
	account := user.User{
		ID:                     s.deps.IDs.NewID(),
		Email:                  email,
		Name:                   firstNonEmpty(strings.TrimSpace(in.Name), defaultNameFromEmail(email)),
		Surname:                strings.TrimSpace(in.Surname),
		Patronymic:             strings.TrimSpace(in.Patronymic),
		PasswordHash:           passwordHash,
		PasswordResetTokenHash: hashToken(resetToken),
		PasswordResetExpiresAt: &expiresAt,
		Role:                   in.Role,
		Status:                 shared.AccountActive,
		CreatedAt:              now,
	}
	if err := s.deps.Users.Create(ctx, account); err != nil {
		return user.User{}, err
	}

	if s.deps.PasswordResets != nil {
		if err := s.deps.PasswordResets.SendPasswordReset(ctx, port.PasswordResetNotification{
			Recipient: account.Email,
			Name:      displayName(account),
			ResetURL:  buildResetURL(s.deps.FrontendURL, resetToken),
			ExpiresAt: expiresAt,
		}); err != nil {
			return user.User{}, err
		}
	}

	return account, nil
}

func (s *Service) ListClients(ctx context.Context) ([]user.User, error) {
	items, err := s.ListUsers(ctx)
	if err != nil {
		return nil, err
	}
	clients := make([]user.User, 0, len(items))
	for _, item := range items {
		if item.Role == shared.RoleClient && item.Status == shared.AccountActive {
			clients = append(clients, item)
		}
	}
	return clients, nil
}

func (s *Service) SetUserStatus(ctx context.Context, id string, status shared.AccountStatus) error {
	if status != shared.AccountActive && status != shared.AccountBlocked && status != shared.AccountDeleted {
		return fmt.Errorf("%w: unsupported account status", shared.ErrValidation)
	}
	account, err := s.deps.Users.FindByID(ctx, id)
	if err != nil {
		return err
	}
	account.Status = status
	return s.deps.Users.Update(ctx, account)
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func randomSecret() (string, error) {
	buffer := make([]byte, 32)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buffer), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func buildResetURL(frontendURL, token string) string {
	base := strings.TrimRight(strings.TrimSpace(frontendURL), "/")
	if base == "" {
		base = "http://localhost:3000"
	}
	return base + "/login?reset_token=" + url.QueryEscape(token)
}

func defaultNameFromEmail(email string) string {
	localPart, _, _ := strings.Cut(email, "@")
	localPart = strings.TrimSpace(localPart)
	if localPart == "" {
		return "Пользователь"
	}
	return localPart
}

func displayName(u user.User) string {
	return strings.Join(nonEmpty(u.Surname, u.Name, u.Patronymic), " ")
}

func nonEmpty(values ...string) []string {
	result := make([]string, 0, len(values))
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}
