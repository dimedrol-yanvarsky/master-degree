// Пакет port объявляет границы (интерфейсы), от которых зависит слой приложения.
// Конкретные реализации живут во внешних слоях adapters/frameworks, благодаря
// чему use case не зависят от фреймворков и БД — как требует чистая
// архитектура.
//
// Интерфейсы репозиториев намеренно не привязаны к коллекциям: они описывают
// поведение, а не хранилище. Привязка к конкретным коллекциям MongoDB отложена
// до фиксации модели данных.
package port

import (
	"context"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/collaboration"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/emotion"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/feedback"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/recommendation"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/specialist"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/test"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/user"
)

// UserRepository хранит учётные записи.
type UserRepository interface {
	Create(ctx context.Context, u user.User) error
	FindByID(ctx context.Context, id string) (user.User, error)
	FindByEmail(ctx context.Context, email string) (user.User, error)
	List(ctx context.Context) ([]user.User, error)
	Update(ctx context.Context, u user.User) error
}

// SessionRepository хранит сессии аутентификации.
type SessionRepository interface {
	Create(ctx context.Context, s user.Session) error
	FindByID(ctx context.Context, id string) (user.Session, error)
	Revoke(ctx context.Context, id string) error
	RevokeAllForUser(ctx context.Context, userID string) error
}

// TestRepository хранит опросники.
type TestRepository interface {
	Create(ctx context.Context, t test.Test) error
	FindByID(ctx context.Context, id string) (test.Test, error)
	List(ctx context.Context) ([]test.Test, error)
	Update(ctx context.Context, t test.Test) error
	Delete(ctx context.Context, id string) error
}

// TestResultRepository хранит результаты прохождения тестов.
type TestResultRepository interface {
	Create(ctx context.Context, r test.TestResult) error
	ListByUser(ctx context.Context, userID string) ([]test.TestResult, error)
}

// EmotionGraphRepository хранит граф эмоционального состояния пользователя.
type EmotionGraphRepository interface {
	FindByUser(ctx context.Context, userID string) (emotion.Graph, error)
	AppendPoint(ctx context.Context, userID string, point emotion.Point) error
}

// RecommendationRepository хранит дерево рекомендаций и назначения.
type RecommendationRepository interface {
	Create(ctx context.Context, b recommendation.Block) error
	FindByID(ctx context.Context, id string) (recommendation.Block, error)
	List(ctx context.Context) ([]recommendation.Block, error)
	Update(ctx context.Context, b recommendation.Block) error
	Delete(ctx context.Context, id string) error
}

// RecommendationAssignmentRepository хранит персональные рекомендации,
// назначенные специалистом клиенту в рамках активного сотрудничества.
type RecommendationAssignmentRepository interface {
	Create(ctx context.Context, a recommendation.Assignment) error
	FindByID(ctx context.Context, id string) (recommendation.Assignment, error)
	ListByClient(ctx context.Context, clientID string) ([]recommendation.Assignment, error)
	ListBySpecialist(ctx context.Context, specialistID string) ([]recommendation.Assignment, error)
	Update(ctx context.Context, a recommendation.Assignment) error
}

// FeedbackRepository хранит отзывы о сервисе.
type FeedbackRepository interface {
	Create(ctx context.Context, f feedback.Feedback) error
	List(ctx context.Context) ([]feedback.Feedback, error)
	FindByID(ctx context.Context, id string) (feedback.Feedback, error)
	Update(ctx context.Context, f feedback.Feedback) error
	Delete(ctx context.Context, id string) error
}

// CollaborationRepository хранит связи специалист↔клиент.
type CollaborationRepository interface {
	Create(ctx context.Context, c collaboration.Collaboration) error
	FindByID(ctx context.Context, id string) (collaboration.Collaboration, error)
	FindBetween(ctx context.Context, specialistID, clientID string) (collaboration.Collaboration, error)
	// ListByClient возвращает все связи клиента (нужно, чтобы оповестить именно
	// тех специалистов, кто с ним сотрудничает).
	ListByClient(ctx context.Context, clientID string) ([]collaboration.Collaboration, error)
	ListBySpecialist(ctx context.Context, specialistID string) ([]collaboration.Collaboration, error)
	Update(ctx context.Context, c collaboration.Collaboration) error
}

// SpecialistRepository читает публичный каталог специалистов.
type SpecialistRepository interface {
	List(ctx context.Context) ([]specialist.Profile, error)
}

type ClientCollaborationRepository interface {
	ListByClient(ctx context.Context, clientID string) ([]collaboration.ClientSpecialist, error)
}

// PasswordHasher хеширует и проверяет пароли (реализуется через bcrypt).
type PasswordHasher interface {
	Hash(password string) (string, error)
	Compare(hash, password string) bool
}

// IDGenerator порождает уникальные идентификаторы для новых агрегатов.
type IDGenerator interface {
	NewID() string
}

// Clock абстрагирует время для детерминированных тестов.
type Clock interface {
	Now() time.Time
}

// TokenClaims — данные проверенного токена доступа, контракт, возвращаемый
// TokenIssuer.Verify (без чувствительных полей, РПЗ §3.2).
type TokenClaims struct {
	UserID    string
	SessionID string
	Role      string
}

// TokenIssuer выпускает и проверяет токены доступа (реализация JWT/HS256 в
// frameworks/security).
type TokenIssuer interface {
	Issue(userID, sessionID, role string) (string, error)
	Verify(token string) (TokenClaims, error)
}

// AttemptLimiter защищает вход от перебора паролей (ТЗ §5.2, РПЗ §3.6). Ключ
// (напр. email) блокируется после слишком многих подряд неудач.
type AttemptLimiter interface {
	Allowed(key string) bool
	Fail(key string)
	Reset(key string)
}

// OAuthIdentity — данные пользователя, полученные от внешнего провайдера входа.
type OAuthIdentity struct {
	ProviderUserID string
	Email          string
	Name           string
	Surname        string
}

// OAuthProvider абстрагирует внешний поток входа (authorization code). Реализация
// (Yandex) живёт в frameworks/oauth. Configured сообщает, заданы ли секреты.
type OAuthProvider interface {
	Configured() bool
	AuthCodeURL(state string) string
	Exchange(ctx context.Context, code string) (OAuthIdentity, error)
}

// SpecialistNotification — оповещение об одной новой вершине графа клиента.
// Получатели уже разрешены use case'ом до адресов специалистов, которые
// сотрудничают именно с этим клиентом.
type PasswordResetNotification struct {
	Recipient string
	Name      string
	ResetURL  string
	ExpiresAt time.Time
}

type PasswordResetNotifier interface {
	SendPasswordReset(ctx context.Context, notification PasswordResetNotification) error
}

type SpecialistNotification struct {
	ClientName  string
	ClientEmail string
	Recipients  []string
	Score       float64
	Level       string
	Date        time.Time
}

// SpecialistNotifier оповещает специалистов клиента о появлении новой вершины в
// его графе эмоционального состояния (модуль «оповещение специалиста», РПЗ рис. 3).
type SpecialistNotifier interface {
	NotifyNewGraphPoint(ctx context.Context, notification SpecialistNotification) error
}
