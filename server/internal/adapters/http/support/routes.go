package support

import "github.com/gin-gonic/gin"

// RegisterRoutes монтирует эндпоинты расчёта поддержки в группу API.
func RegisterRoutes(group *gin.RouterGroup, handler *Handler) {
	group.POST("/support/calculate", handler.Calculate)
}
