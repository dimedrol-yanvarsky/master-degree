package testing

import "github.com/gin-gonic/gin"

// RegisterProtectedRoutes монтирует эндпоинты тестирования, требующие сессии.
// На группу уже должен быть навешен middleware Auth.
func RegisterProtectedRoutes(group *gin.RouterGroup, handler *Handler) {
	group.POST("/me/test-results", handler.Submit)
	group.GET("/me/emotion-graph", handler.Graph)
}
