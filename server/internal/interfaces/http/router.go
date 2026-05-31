package http

import (
	"net/http"

	authhttp "github.com/dimedrol-yanvarsky/master-degree/server/internal/interfaces/http/auth"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/interfaces/http/middleware"
	supporthttp "github.com/dimedrol-yanvarsky/master-degree/server/internal/interfaces/http/support"
	testinghttp "github.com/dimedrol-yanvarsky/master-degree/server/internal/interfaces/http/testing"
	"github.com/gin-gonic/gin"
)

// Dependencies — собранные компоненты, нужные роутеру. Новые подсистемы
// (рекомендации, отзывы, ...) расширяют эту структуру по мере добавления.
type Dependencies struct {
	SupportHandler *supporthttp.Handler
	AuthHandler    *authhttp.Handler
	TestingHandler *testinghttp.Handler
	Authenticator  middleware.Authenticator
	DBConnected    func() bool
}

// NewRouter собирает движок Gin: middleware, публичную проверку health,
// публичный API и аутентифицированный API (под middleware Auth).
func NewRouter(deps Dependencies) *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery(), middleware.CORS(), middleware.ErrorHandler())

	router.GET("/health", func(c *gin.Context) {
		database := "disconnected"
		if deps.DBConnected != nil && deps.DBConnected() {
			database = "connected"
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok", "database": database})
	})

	api := router.Group("/api/v1")

	// Публичные маршруты.
	if deps.SupportHandler != nil {
		supporthttp.RegisterRoutes(api, deps.SupportHandler)
	}
	if deps.AuthHandler != nil {
		authhttp.RegisterPublicRoutes(api, deps.AuthHandler)
	}

	// Аутентифицированные маршруты.
	if deps.Authenticator != nil {
		protected := api.Group("")
		protected.Use(middleware.Auth(deps.Authenticator))
		if deps.AuthHandler != nil {
			authhttp.RegisterProtectedRoutes(protected, deps.AuthHandler)
		}
		if deps.TestingHandler != nil {
			testinghttp.RegisterProtectedRoutes(protected, deps.TestingHandler)
		}
	}

	return router
}
