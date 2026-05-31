package account

import (
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/interfaces/http/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterProtectedRoutes(group *gin.RouterGroup, handler *Handler) {
	specialist := group.Group("", middleware.RoleGuard(shared.RoleSpecialist, shared.RoleAdmin))
	specialist.GET("/clients", handler.ListClients)

	admin := group.Group("", middleware.RoleGuard(shared.RoleAdmin))
	admin.GET("/admin/users", handler.ListUsers)
	admin.POST("/admin/users", handler.CreateUser)
	admin.PATCH("/admin/users/:id/status", handler.SetUserStatus)
	admin.DELETE("/admin/users/:id", handler.DeleteUser)
}
