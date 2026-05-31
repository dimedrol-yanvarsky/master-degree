package collaboration

import "github.com/gin-gonic/gin"

func RegisterProtectedRoutes(group *gin.RouterGroup, handler *Handler) {
	group.GET("/me/collaborations", handler.ListClientSpecialists)
}
