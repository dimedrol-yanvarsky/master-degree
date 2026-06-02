package recommendation

import (
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/adapters/http/middleware"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	"github.com/gin-gonic/gin"
)

func RegisterPublicRoutes(group *gin.RouterGroup, handler *Handler) {
	group.GET("/recommendations", handler.List)
}

func RegisterProtectedRoutes(group *gin.RouterGroup, handler *Handler) {
	editors := group.Group("", middleware.RoleGuard(shared.RoleSpecialist))
	editors.POST("/recommendations/sections", handler.CreateSection)
	editors.POST("/recommendations/blocks", handler.CreateBlock)
	editors.PATCH("/recommendations/sections/:id", handler.UpdateSection)
	editors.PATCH("/recommendations/blocks/:id", handler.UpdateBlock)
	editors.POST("/recommendations/assignments", handler.AssignToClient)
	editors.GET("/recommendations/assignments", handler.ListSpecialistAssignments)
	editors.DELETE("/recommendations/assignments/:id", handler.DeleteAssignment)

	managers := group.Group("", middleware.RoleGuard(shared.RoleSpecialist, shared.RoleAdmin))
	managers.DELETE("/recommendations/sections/:id", handler.DeleteSection)
	managers.DELETE("/recommendations/blocks/:id", handler.DeleteBlock)

	clients := group.Group("", middleware.RoleGuard(shared.RoleClient))
	clients.GET("/me/recommendation-assignments", handler.ListMyAssignments)
}
