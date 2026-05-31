package specialist

import "github.com/gin-gonic/gin"

// RegisterPublicRoutes монтирует публичный каталог специалистов.
func RegisterPublicRoutes(group *gin.RouterGroup, handler *Handler) {
	group.GET("/specialists", handler.List)
}
