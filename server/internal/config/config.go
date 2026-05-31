package config

import (
	"os"
	"strconv"
	"time"
)

const (
	defaultHTTPAddress      = ":8080"
	defaultFrontendURL      = "http://localhost:3000"
	defaultMongoURI         = "mongodb://localhost:27017"
	defaultMongoDatabase    = "emotional_state_control"
	defaultAccessTokenTTL   = 15 * time.Minute
	defaultRefreshTokenTTL  = 30 * 24 * time.Hour
	defaultBcryptCost       = 12
	defaultMaxLoginAttempts = 5
	defaultJWTSecret        = "change-me-in-production"
	defaultYandexRedirect   = "http://localhost:8080/api/v1/auth/oauth/yandex/callback"
	defaultSMTPPort         = 587
)

// Config — конфигурация времени выполнения, собранная из переменных окружения.
type Config struct {
	HTTPAddress string
	// FrontendURL — адрес SPA, куда сервер возвращает пользователя после OAuth.
	FrontendURL string
	// SeedDevData засевает in-memory хранилища демо-аккаунтами и связью
	// специалист↔клиент (чтобы локально работали вход и оповещение по почте).
	SeedDevData bool
	Mongo       MongoConfig
	Security    SecurityConfig
	OAuth       OAuthConfig
	SMTP        SMTPConfig
}

// OAuthConfig группирует настройки внешних провайдеров входа.
type OAuthConfig struct {
	Yandex YandexOAuthConfig
}

// YandexOAuthConfig — параметры приложения Yandex OAuth2. Пустые ClientID/Secret
// означают, что провайдер не настроен (эндпоинты вернут «not configured»).
type YandexOAuthConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

// SMTPConfig — параметры отправки писем специалистам. Пустой Host/From означает,
// что почта не настроена и письма пишутся в лог (безопасный фоллбэк).
type SMTPConfig struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
}

// MongoConfig описывает, как достучаться до экземпляра MongoDB. Имена коллекций
// здесь не хранятся — их привязывают позже конкретные репозитории.
type MongoConfig struct {
	URI          string
	DatabaseName string
}

// SecurityConfig группирует параметры технологии разграничения доступа
// (аутентификация, сессии, хеширование паролей, защита от перебора).
type SecurityConfig struct {
	JWTSecret        string
	AccessTokenTTL   time.Duration
	RefreshTokenTTL  time.Duration
	BcryptCost       int
	MaxLoginAttempts int
}

// Load читает конфигурацию из окружения, подставляя значения по умолчанию.
func Load() Config {
	return Config{
		HTTPAddress: getEnv("HTTP_ADDRESS", defaultHTTPAddress),
		FrontendURL: getEnv("FRONTEND_URL", defaultFrontendURL),
		SeedDevData: getBoolEnv("SEED_DEV_DATA", true),
		Mongo: MongoConfig{
			URI:          getEnv("MONGO_URI", defaultMongoURI),
			DatabaseName: getEnv("MONGO_DATABASE", defaultMongoDatabase),
		},
		Security: SecurityConfig{
			JWTSecret:        getEnv("JWT_SECRET", defaultJWTSecret),
			AccessTokenTTL:   getDurationEnv("ACCESS_TOKEN_TTL", defaultAccessTokenTTL),
			RefreshTokenTTL:  getDurationEnv("REFRESH_TOKEN_TTL", defaultRefreshTokenTTL),
			BcryptCost:       getIntEnv("BCRYPT_COST", defaultBcryptCost),
			MaxLoginAttempts: getIntEnv("MAX_LOGIN_ATTEMPTS", defaultMaxLoginAttempts),
		},
		OAuth: OAuthConfig{
			Yandex: YandexOAuthConfig{
				ClientID:     getEnv("YANDEX_OAUTH_CLIENT_ID", ""),
				ClientSecret: getEnv("YANDEX_OAUTH_CLIENT_SECRET", ""),
				RedirectURL:  getEnv("YANDEX_OAUTH_REDIRECT_URL", defaultYandexRedirect),
			},
		},
		SMTP: SMTPConfig{
			Host:     getEnv("SMTP_HOST", ""),
			Port:     getIntEnv("SMTP_PORT", defaultSMTPPort),
			Username: getEnv("SMTP_USERNAME", ""),
			Password: getEnv("SMTP_PASSWORD", ""),
			From:     getEnv("SMTP_FROM", ""),
		},
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}

	return fallback
}

func getIntEnv(key string, fallback int) int {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil {
			return parsed
		}
	}

	return fallback
}

func getDurationEnv(key string, fallback time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if parsed, err := time.ParseDuration(value); err == nil {
			return parsed
		}
	}

	return fallback
}

func getBoolEnv(key string, fallback bool) bool {
	if value := os.Getenv(key); value != "" {
		if parsed, err := strconv.ParseBool(value); err == nil {
			return parsed
		}
	}

	return fallback
}
