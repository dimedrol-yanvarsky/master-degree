package http

import (
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/features/tasks"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/http/middleware"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

func NewRouter(database *mongo.Database) *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery(), middleware.CORS(), middleware.ErrorHandler())

	api := router.Group("/api/v1")

	taskRepository := tasks.NewMongoRepository(database)
	taskService := tasks.NewService(taskRepository)

	tasks.RegisterRoutes(api, taskService)

	return router
}
