package testing

import "github.com/gin-gonic/gin"

func RegisterPublicRoutes(group *gin.RouterGroup, handler *Handler) {
	group.GET("/tests", handler.ListTests)
}

// RegisterProtectedRoutes монтирует эндпоинты тестирования, требующие сессии.
// На группу уже должен быть навешен middleware Auth.
func RegisterProtectedRoutes(group *gin.RouterGroup, handler *Handler) {
	group.GET("/me/test-results", handler.ListResults)
	group.POST("/me/test-results", handler.Submit)
	group.GET("/me/emotion-graph", handler.Graph)
}
