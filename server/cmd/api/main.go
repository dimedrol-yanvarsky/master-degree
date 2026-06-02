package main

import (
	"context"
	"log"

	apphttp "github.com/dimedrol-yanvarsky/master-degree/server/internal/adapters/http"
	accounthttp "github.com/dimedrol-yanvarsky/master-degree/server/internal/adapters/http/account"
	authhttp "github.com/dimedrol-yanvarsky/master-degree/server/internal/adapters/http/auth"
	collaborationhttp "github.com/dimedrol-yanvarsky/master-degree/server/internal/adapters/http/collaboration"
	feedbackhttp "github.com/dimedrol-yanvarsky/master-degree/server/internal/adapters/http/feedback"
	recommendationhttp "github.com/dimedrol-yanvarsky/master-degree/server/internal/adapters/http/recommendation"
	specialisthttp "github.com/dimedrol-yanvarsky/master-degree/server/internal/adapters/http/specialist"
	supporthttp "github.com/dimedrol-yanvarsky/master-degree/server/internal/adapters/http/support"
	testinghttp "github.com/dimedrol-yanvarsky/master-degree/server/internal/adapters/http/testing"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/adapters/persistence/memory"
	mongopersistence "github.com/dimedrol-yanvarsky/master-degree/server/internal/adapters/persistence/mongodb"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/collaboration"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	domainsupport "github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/support"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/user"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/frameworks/config"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/frameworks/email"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/frameworks/mongodb"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/frameworks/oauth"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/frameworks/security"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/frameworks/system"
	appaccount "github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/account"
	appauth "github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/auth"
	appcollaboration "github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/collaboration"
	appfeedback "github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/feedback"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
	apprecommendation "github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/recommendation"
	appspecialist "github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/specialist"
	appsupport "github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/support"
	apptesting "github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/testing"
)

func main() {
	cfg := config.Load()

	// MongoDB опциональна для локального запуска: при наличии подключения
	// основные данные читаются из коллекций, иначе используется in-memory fallback.
	adapter := connectMongo(cfg.Mongo)

	// Общие примитивы инфраструктуры.
	idGenerator := mongodb.ObjectIDGenerator{}
	clock := system.Clock{}
	hasher := security.NewPasswordHasher(cfg.Security.BcryptCost)

	// In-memory fallback нужен только когда MongoDB недоступна.
	memoryUsers := memory.NewUserRepository()
	memorySessions := memory.NewSessionRepository()
	memoryCollaborations := memory.NewCollaborationRepository()
	memoryGraphs := memory.NewEmotionGraphRepository()
	memoryTests := memory.NewTestRepository()
	memoryFeedback := memory.NewFeedbackRepository()
	memoryRecommendationAssignments := memory.NewRecommendationAssignmentRepository()

	var users port.UserRepository = memoryUsers
	var sessions port.SessionRepository = memorySessions
	var collaborations port.CollaborationRepository = memoryCollaborations
	var graphs port.EmotionGraphRepository = memoryGraphs
	var tests port.TestRepository = memoryTests
	var testResults port.TestResultRepository = memory.NewTestResultRepository()
	var clientCollaborations port.ClientCollaborationRepository
	var feedbackRepository port.FeedbackRepository = memoryFeedback
	var recommendationRepository port.RecommendationRepository
	var recommendationAssignments port.RecommendationAssignmentRepository = memoryRecommendationAssignments
	if adapter.Connected() {
		users = mongopersistence.NewUserRepository(adapter)
		sessions = mongopersistence.NewSessionRepository(adapter)
		collaborations = mongopersistence.NewCollaborationRepository(adapter)
		graphs = mongopersistence.NewEmotionGraphRepository(adapter)
		tests = mongopersistence.NewTestRepository(adapter)
		testResults = mongopersistence.NewTestResultRepository(adapter)
		clientCollaborations = mongopersistence.NewClientCollaborationRepository(adapter)
		feedbackRepository = mongopersistence.NewFeedbackRepository(adapter)
		recommendationRepository = mongopersistence.NewRecommendationRepository(adapter)
		recommendationAssignments = mongopersistence.NewRecommendationAssignmentRepository(adapter)
	}
	specialists := mongopersistence.NewSpecialistRepository(adapter)

	// Демо-данные для локального запуска: аккаунты (пароль lumen123) и принятая
	// связь специалист↔клиент, чтобы вход и оповещение по почте работали без БД.
	if cfg.SeedDevData && !adapter.Connected() {
		seedDevData(memoryUsers, memoryCollaborations, hasher, idGenerator, clock)
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
		Users:          users,
		Sessions:       sessions,
		Hasher:         hasher,
		Tokens:         tokenIssuer{security.NewTokenIssuer(cfg.Security.JWTSecret, cfg.Security.AccessTokenTTL)},
		IDs:            idGenerator,
		Clock:          clock,
		Limiter:        memory.NewAttemptLimiter(cfg.Security.MaxLoginAttempts),
		OAuth:          yandexProvider,
		PasswordResets: notifier,
		FrontendURL:    cfg.FrontendURL,
		AccessTTL:      cfg.Security.AccessTokenTTL,
		RefreshTTL:     cfg.Security.RefreshTokenTTL,
	})

	// Приём результатов тестов: новая вершина графа → письмо сотрудничающим
	// специалистам клиента.
	testingService := apptesting.NewService(apptesting.Deps{
		Tests:          tests,
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
		AccountHandler: accounthttp.NewHandler(appaccount.NewService(appaccount.Deps{
			Users:          users,
			Hasher:         hasher,
			IDs:            idGenerator,
			Clock:          clock,
			PasswordResets: notifier,
			FrontendURL:    cfg.FrontendURL,
		})),
		CollaborationHandler: collaborationhttp.NewHandler(appcollaboration.NewService(appcollaboration.Deps{
			ClientCollaborations: clientCollaborations,
			Collaborations:       collaborations,
			Users:                users,
			IDs:                  idGenerator,
			Clock:                clock,
		})),
		FeedbackHandler: feedbackhttp.NewHandler(appfeedback.NewService(appfeedback.Deps{
			Feedback: feedbackRepository,
			Users:    users,
			IDs:      idGenerator,
			Clock:    clock,
		})),
		RecommendationHandler: recommendationhttp.NewHandler(apprecommendation.NewService(apprecommendation.Deps{
			Repository:     recommendationRepository,
			Assignments:    recommendationAssignments,
			Collaborations: collaborations,
			Users:          users,
			IDs:            idGenerator,
			Clock:          clock,
		})),
		SpecialistHandler: specialisthttp.NewHandler(appspecialist.NewService(specialists)),
		TestingHandler:    testinghttp.NewHandler(testingService),
		Authenticator:     authService,
		DBConnected:       adapter.Connected,
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
// неподключённый адаптер, чтобы сервер мог работать с in-memory fallback.
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
