package http

import (
	"net/http"

	authhttp "github.com/dimedrol-yanvarsky/master-degree/server/internal/interfaces/http/auth"
	collaborationhttp "github.com/dimedrol-yanvarsky/master-degree/server/internal/interfaces/http/collaboration"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/interfaces/http/middleware"
	specialisthttp "github.com/dimedrol-yanvarsky/master-degree/server/internal/interfaces/http/specialist"
	supporthttp "github.com/dimedrol-yanvarsky/master-degree/server/internal/interfaces/http/support"
	testinghttp "github.com/dimedrol-yanvarsky/master-degree/server/internal/interfaces/http/testing"
	"github.com/gin-gonic/gin"
)

// Dependencies — собранные компоненты, нужные роутеру. Новые подсистемы
// (рекомендации, отзывы, ...) расширяют эту структуру по мере добавления.
type Dependencies struct {
	SupportHandler       *supporthttp.Handler
	AuthHandler          *authhttp.Handler
	CollaborationHandler *collaborationhttp.Handler
	SpecialistHandler    *specialisthttp.Handler
	TestingHandler       *testinghttp.Handler
	Authenticator        middleware.Authenticator
	DBConnected          func() bool
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
	if deps.SpecialistHandler != nil {
		specialisthttp.RegisterPublicRoutes(api, deps.SpecialistHandler)
	}
	if deps.TestingHandler != nil {
		testinghttp.RegisterPublicRoutes(api, deps.TestingHandler)
	}

	// Аутентифицированные маршруты.
	if deps.Authenticator != nil {
		protected := api.Group("")
		protected.Use(middleware.Auth(deps.Authenticator))
		if deps.AuthHandler != nil {
			authhttp.RegisterProtectedRoutes(protected, deps.AuthHandler)
		}
		if deps.CollaborationHandler != nil {
			collaborationhttp.RegisterProtectedRoutes(protected, deps.CollaborationHandler)
		}
		if deps.TestingHandler != nil {
			testinghttp.RegisterProtectedRoutes(protected, deps.TestingHandler)
		}
	}

	return router
}
