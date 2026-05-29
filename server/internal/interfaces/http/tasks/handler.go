package tasks

import (
	"context"
	"errors"
	"net/http"

	taskusecase "github.com/dimedrol-yanvarsky/master-degree/server/internal/application/task"
	"github.com/gin-gonic/gin"
)

type CreateTaskUseCase interface {
	Create(ctx context.Context, input taskusecase.CreateTaskInput) (*taskusecase.TaskOutput, error)
}

type Handler struct {
	createTaskUseCase CreateTaskUseCase
}

func NewHandler(createTaskUseCase CreateTaskUseCase) *Handler {
	return &Handler{
		createTaskUseCase: createTaskUseCase,
	}
}

func (h *Handler) Create(c *gin.Context) {
	var request createTaskRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	task, err := h.createTaskUseCase.Create(c.Request.Context(), taskusecase.CreateTaskInput{
		Title: request.Title,
	})
	if err != nil {
		if errors.Is(err, taskusecase.ErrInvalidTitle) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid request data",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Could not create task",
		})
		return
	}

	c.JSON(http.StatusCreated, task)
}
