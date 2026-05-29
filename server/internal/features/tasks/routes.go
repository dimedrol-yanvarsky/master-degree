package tasks

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter, service *Service) {
	handler := NewHandler(service)

	group := router.Group("/tasks")
	{
		group.POST("", handler.Create)
	}
}
