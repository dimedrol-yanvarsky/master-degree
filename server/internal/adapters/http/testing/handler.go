package testing

import (
	"context"
	"net/http"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/adapters/http/middleware"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/emotion"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/test"
	apptesting "github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/testing"
	"github.com/gin-gonic/gin"
)

// Service — граница приложения, потребляемая обработчиком тестирования.
type Service interface {
	Submit(ctx context.Context, in apptesting.SubmitInput) (apptesting.SubmitResult, error)
	ListTests(ctx context.Context) ([]test.Test, error)
	CreateTest(ctx context.Context, in apptesting.CreateTestInput) (test.Test, error)
	UpdateTest(ctx context.Context, in apptesting.UpdateTestInput) (test.Test, error)
	DeleteTest(ctx context.Context, actorID, id string) error
	ListResults(ctx context.Context, userID string) ([]test.TestResult, error)
	ListClientResults(ctx context.Context, specialistID, clientID string) ([]test.TestResult, error)
	Graph(ctx context.Context, userID string) (emotion.Graph, error)
	ClientGraph(ctx context.Context, specialistID, clientID string) (emotion.Graph, error)
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

func (h *Handler) CreateTest(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	var request createTestRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	item, err := h.service.CreateTest(c.Request.Context(), request.toInput(identity.UserID))
	if err != nil {
		_ = c.Error(err)
		return
	}

	c.JSON(http.StatusCreated, toTestItemResponse(item))
}

func (h *Handler) UpdateTest(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	var request createTestRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	item, err := h.service.UpdateTest(c.Request.Context(), request.toUpdateInput(identity.UserID, c.Param("id")))
	if err != nil {
		_ = c.Error(err)
		return
	}

	c.JSON(http.StatusOK, toTestItemResponse(item))
}

func (h *Handler) DeleteTest(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	if err := h.service.DeleteTest(c.Request.Context(), identity.UserID, c.Param("id")); err != nil {
		_ = c.Error(err)
		return
	}
	c.Status(http.StatusNoContent)
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

func (h *Handler) ListClientResults(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	results, err := h.service.ListClientResults(c.Request.Context(), identity.UserID, c.Param("id"))
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

func (h *Handler) ClientGraph(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	graph, err := h.service.ClientGraph(c.Request.Context(), identity.UserID, c.Param("id"))
	if err != nil {
		_ = c.Error(err)
		return
	}

	c.JSON(http.StatusOK, toGraphResponse(graph))
}
