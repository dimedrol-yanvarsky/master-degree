package main

import (
	"context"
	"log"

	appauth "github.com/dimedrol-yanvarsky/master-degree/server/internal/application/auth"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/application/port"
	appsupport "github.com/dimedrol-yanvarsky/master-degree/server/internal/application/support"
	apptesting "github.com/dimedrol-yanvarsky/master-degree/server/internal/application/testing"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/config"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/collaboration"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
	domainsupport "github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/support"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/user"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/infrastructure/email"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/infrastructure/mongodb"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/infrastructure/oauth"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/infrastructure/persistence/memory"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/infrastructure/security"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/infrastructure/system"
	apphttp "github.com/dimedrol-yanvarsky/master-degree/server/internal/interfaces/http"
	authhttp "github.com/dimedrol-yanvarsky/master-degree/server/internal/interfaces/http/auth"
	supporthttp "github.com/dimedrol-yanvarsky/master-degree/server/internal/interfaces/http/support"
	testinghttp "github.com/dimedrol-yanvarsky/master-degree/server/internal/interfaces/http/testing"
)

func main() {
	cfg := config.Load()

	// MongoDB на этом этапе опциональна: адаптер доступа к данным подключён, но
	// коллекции ещё не привязаны, поэтому сервер запускается и без работающей
	// БД. Состояние аккаунтов хранится в памяти, пока не реализованы конкретные
	// репозитории MongoDB (с привязкой коллекций).
	adapter := connectMongo(cfg.Mongo)

	// Общие примитивы инфраструктуры.
	idGenerator := mongodb.ObjectIDGenerator{}
	clock := system.Clock{}
	hasher := security.NewPasswordHasher(cfg.Security.BcryptCost)

	// Хранилища в памяти. Репозиторий пользователей общий: его используют и auth,
	// и подсистема тестирования (чтобы видеть одних и тех же специалистов/клиентов).
	users := memory.NewUserRepository()
	sessions := memory.NewSessionRepository()
	collaborations := memory.NewCollaborationRepository()
	graphs := memory.NewEmotionGraphRepository()
	testResults := memory.NewTestResultRepository()

	// Демо-данные для локального запуска: аккаунты (пароль lumen123) и принятая
	// связь специалист↔клиент, чтобы вход и оповещение по почте работали без БД.
	if cfg.SeedDevData {
		seedDevData(users, collaborations, hasher, idGenerator, clock)
	}

	// Внешний вход (Yandex) и оповещение специалистов по почте. Без секретов в
	// окружении OAuth отдаёт «not configured», а письма пишутся в лог.
	yandexProvider := oauth.NewYandexProvider(
		cfg.OAuth.Yandex.ClientID,
		cfg.OAuth.Yandex.ClientSecret,
		cfg.OAuth.Yandex.RedirectURL,
	)
	notifier := email.NewSMTPNotifier(
		cfg.SMTP.Host,
		cfg.SMTP.Port,
		cfg.SMTP.Username,
		cfg.SMTP.Password,
		cfg.SMTP.From,
	)

	// Расчёт потребности в поддержке (доменный нечёткий движок).
	engine := domainsupport.NewEngine()
	supportHandler := supporthttp.NewHandler(appsupport.NewCalculateUseCase(engine))

	// Обработка учётных записей и разграничение доступа (пароль + OAuth).
	authService := appauth.NewService(appauth.Deps{
		Users:      users,
		Sessions:   sessions,
		Hasher:     hasher,
		Tokens:     tokenIssuer{security.NewTokenIssuer(cfg.Security.JWTSecret, cfg.Security.AccessTokenTTL)},
		IDs:        idGenerator,
		Clock:      clock,
		Limiter:    memory.NewAttemptLimiter(cfg.Security.MaxLoginAttempts),
		OAuth:      yandexProvider,
		AccessTTL:  cfg.Security.AccessTokenTTL,
		RefreshTTL: cfg.Security.RefreshTokenTTL,
	})

	// Приём результатов тестов: новая вершина графа → письмо сотрудничающим
	// специалистам клиента.
	testingService := apptesting.NewService(apptesting.Deps{
		Results:        testResults,
		Graphs:         graphs,
		Collaborations: collaborations,
		Users:          users,
		Notifier:       notifier,
		IDs:            idGenerator,
		Clock:          clock,
	})

	router := apphttp.NewRouter(apphttp.Dependencies{
		SupportHandler: supportHandler,
		AuthHandler:    authhttp.NewHandler(authService, cfg.FrontendURL),
		TestingHandler: testinghttp.NewHandler(testingService),
		Authenticator:  authService,
		DBConnected:    adapter.Connected,
	})

	log.Printf("server is running on %s", cfg.HTTPAddress)
	if err := router.Run(cfg.HTTPAddress); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}

// tokenIssuer адаптирует инфраструктурного издателя JWT к границе
// port.TokenIssuer (преобразует security.Claims в port.TokenClaims). Размещение
// в корне композиции избавляет оба слоя от типов друг друга.
type tokenIssuer struct {
	inner *security.TokenIssuer
}

// Проверка на этапе компиляции: адаптер корня композиции удовлетворяет порту.
var _ port.TokenIssuer = tokenIssuer{}

func (t tokenIssuer) Issue(userID, sessionID, role string) (string, error) {
	return t.inner.Issue(userID, sessionID, role)
}

func (t tokenIssuer) Verify(token string) (port.TokenClaims, error) {
	claims, err := t.inner.Verify(token)
	if err != nil {
		return port.TokenClaims{}, err
	}
	return port.TokenClaims{
		UserID:    claims.UserID,
		SessionID: claims.SessionID,
		Role:      claims.Role,
	}, nil
}

// seedDevData засевает in-memory хранилища демонстрационными аккаунтами и
// принятой связью специалист↔клиент. Пароль у всех — lumen123. Специалист
// specialist@lumen.local сотрудничает с клиентом completed@demo.local, поэтому
// при повторном прохождении обоих тестов клиентом специалист получает письмо.
func seedDevData(users *memory.UserRepository, collaborations *memory.CollaborationRepository, hasher port.PasswordHasher, ids port.IDGenerator, clock port.Clock) {
	ctx := context.Background()
	password, err := hasher.Hash("lumen123")
	if err != nil {
		log.Printf("dev seed: hash password: %v", err)
		return
	}

	specialistID := ids.NewID()
	clientID := ids.NewID()

	accounts := []user.User{
		{ID: specialistID, Email: "specialist@lumen.local", Name: "Марина", Patronymic: "Игоревна", Role: shared.RoleSpecialist},
		{ID: clientID, Email: "completed@demo.local", Name: "Дмитрий", Surname: "Голубев", Patronymic: "Викторович", Role: shared.RoleClient},
		{ID: ids.NewID(), Email: "test@lumen.local", Name: "Тестовый", Patronymic: "Демо", Role: shared.RoleClient},
		{ID: ids.NewID(), Email: "admin@lumen.local", Name: "Администратор", Patronymic: "Системы", Role: shared.RoleAdmin},
	}
	for _, account := range accounts {
		account.PasswordHash = password
		account.Status = shared.AccountActive
		account.CreatedAt = clock.Now()
		if err := users.Create(ctx, account); err != nil {
			log.Printf("dev seed: create user %s: %v", account.Email, err)
		}
	}

	collab := collaboration.Collaboration{
		ID:           ids.NewID(),
		SpecialistID: specialistID,
		ClientID:     clientID,
		StartedAt:    clock.Now(),
		Status:       collaboration.StatusAccepted,
	}
	if err := collaborations.Create(ctx, collab); err != nil {
		log.Printf("dev seed: create collaboration: %v", err)
	}

	log.Printf("dev seed: демо-аккаунты готовы (пароль lumen123); specialist@lumen.local сотрудничает с completed@demo.local")
}

// connectMongo пытается подключиться к MongoDB. Сбой некритичен: возвращает
// неподключённый адаптер и пишет предупреждение, т.к. коллекции пока не
// используются.
func connectMongo(cfg config.MongoConfig) *mongodb.Adapter {
	connection, err := mongodb.Connect(context.Background(), mongodb.Config{
		URI:          cfg.URI,
		DatabaseName: cfg.DatabaseName,
	})
	if err != nil {
		log.Printf("warning: MongoDB is not connected (%v); collections are not bound yet, continuing", err)
		return mongodb.NewAdapter(nil)
	}

	return mongodb.NewAdapter(connection.Database)
}
