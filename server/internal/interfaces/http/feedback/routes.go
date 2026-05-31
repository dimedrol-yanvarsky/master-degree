package feedback

import (
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/interfaces/http/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterPublicRoutes(group *gin.RouterGroup, handler *Handler) {
	group.GET("/reviews", handler.List)
}

func RegisterProtectedRoutes(group *gin.RouterGroup, handler *Handler) {
	clients := group.Group("", middleware.RoleGuard(shared.RoleClient))
	clients.GET("/me/reviews", handler.ListOwn)
	clients.POST("/reviews", handler.Create)
	clients.PATCH("/me/reviews/:id", handler.UpdateOwn)
	clients.DELETE("/me/reviews/:id", handler.DeleteOwn)

	admin := group.Group("", middleware.RoleGuard(shared.RoleAdmin))
	admin.GET("/admin/reviews", handler.ListModeration)
	admin.PATCH("/admin/reviews/:id/status", handler.SetStatus)
	admin.DELETE("/admin/reviews/:id", handler.Delete)
}
