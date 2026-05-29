package http

import (
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/interfaces/http/middleware"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/interfaces/http/tasks"
	"github.com/gin-gonic/gin"
)

type Dependencies struct {
	CreateTaskUseCase tasks.CreateTaskUseCase
}

func NewRouter(dependencies Dependencies) *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery(), middleware.CORS(), middleware.ErrorHandler())

	api := router.Group("/api/v1")
	tasks.RegisterRoutes(api, dependencies.CreateTaskUseCase)

	return router
}
