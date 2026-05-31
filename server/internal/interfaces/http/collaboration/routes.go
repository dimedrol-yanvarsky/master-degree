package collaboration

import "github.com/gin-gonic/gin"

func RegisterProtectedRoutes(group *gin.RouterGroup, handler *Handler) {
	group.GET("/me/collaborations", handler.ListClientSpecialists)
	group.GET("/me/collaboration-requests", handler.ListWorkRequests)
	group.POST("/me/collaboration-requests", handler.CreateRequest)
	group.PATCH("/me/collaboration-requests/:id", handler.RespondToRequest)
	group.PATCH("/me/collaborations/:id/finish", handler.FinishCollaboration)
}
