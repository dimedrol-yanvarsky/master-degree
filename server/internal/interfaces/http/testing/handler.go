package testing

import (
	"context"
	"net/http"

	apptesting "github.com/dimedrol-yanvarsky/master-degree/server/internal/application/testing"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/emotion"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/test"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/interfaces/http/middleware"
	"github.com/gin-gonic/gin"
)

// Service — граница приложения, потребляемая обработчиком тестирования.
type Service interface {
	Submit(ctx context.Context, in apptesting.SubmitInput) (apptesting.SubmitResult, error)
	ListTests(ctx context.Context) ([]test.Test, error)
	ListResults(ctx context.Context, userID string) ([]test.TestResult, error)
	Graph(ctx context.Context, userID string) (emotion.Graph, error)
}

// Handler публикует эндпоинты прохождения тестов и графа эмоций.
type Handler struct {
	service Service
}

// NewHandler собирает обработчик тестирования.
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) ListTests(c *gin.Context) {
	tests, err := h.service.ListTests(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}

	c.JSON(http.StatusOK, toTestsResponse(tests))
}

func (h *Handler) ListResults(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	results, err := h.service.ListResults(c.Request.Context(), identity.UserID)
	if err != nil {
		_ = c.Error(err)
		return
	}

	c.JSON(http.StatusOK, toResultsResponse(results))
}

// Submit обрабатывает POST /me/test-results (защищённый): принимает результат
// теста текущего пользователя.
func (h *Handler) Submit(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	var request submitRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	result, err := h.service.Submit(c.Request.Context(), request.toInput(identity.UserID))
	if err != nil {
		_ = c.Error(err)
		return
	}

	c.JSON(http.StatusCreated, toSubmitResponse(result))
}

// Graph обрабатывает GET /me/emotion-graph (защищённый).
func (h *Handler) Graph(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	graph, err := h.service.Graph(c.Request.Context(), identity.UserID)
	if err != nil {
		_ = c.Error(err)
		return
	}

	c.JSON(http.StatusOK, toGraphResponse(graph))
}
