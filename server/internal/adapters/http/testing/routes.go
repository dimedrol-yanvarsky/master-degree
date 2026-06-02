package testing

import (
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/adapters/http/middleware"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	"github.com/gin-gonic/gin"
)

func RegisterPublicRoutes(group *gin.RouterGroup, handler *Handler) {
	group.GET("/tests", handler.ListTests)
}

// RegisterProtectedRoutes монтирует эндпоинты тестирования, требующие сессии.
// На группу уже должен быть навешен middleware Auth.
func RegisterProtectedRoutes(group *gin.RouterGroup, handler *Handler) {
	managers := group.Group("")
	managers.Use(middleware.RoleGuard(shared.RoleAdmin, shared.RoleSpecialist))
	managers.POST("/tests", handler.CreateTest)
	managers.PATCH("/tests/:id", handler.UpdateTest)
	managers.DELETE("/tests/:id", handler.DeleteTest)

	specialists := group.Group("", middleware.RoleGuard(shared.RoleSpecialist))
	specialists.GET("/clients/:id/test-results", handler.ListClientResults)
	specialists.GET("/clients/:id/emotion-graph", handler.ClientGraph)

	group.GET("/me/test-results", handler.ListResults)
	group.POST("/me/test-results", handler.Submit)
	group.GET("/me/emotion-graph", handler.Graph)
}
