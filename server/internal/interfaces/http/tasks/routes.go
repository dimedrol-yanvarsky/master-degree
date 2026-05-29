package tasks

import "github.com/gin-gonic/gin"

func RegisterRoutes(router gin.IRouter, createTaskUseCase CreateTaskUseCase) {
	handler := NewHandler(createTaskUseCase)

	group := router.Group("/tasks")
	{
		group.POST("", handler.Create)
	}
}
