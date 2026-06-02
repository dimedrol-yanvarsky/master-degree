package feedback

import (
	"context"
	"net/http"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/adapters/http/middleware"
	appfeedback "github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/feedback"
	"github.com/gin-gonic/gin"
)

type Service interface {
	List(ctx context.Context) ([]appfeedback.ReviewView, error)
	ListModeration(ctx context.Context) ([]appfeedback.ReviewView, error)
	ListOwn(ctx context.Context, userID string) ([]appfeedback.ReviewView, error)
	Create(ctx context.Context, userID, body string) (appfeedback.ReviewView, error)
	UpdateOwn(ctx context.Context, userID, id, body string) (appfeedback.ReviewView, error)
	DeleteOwn(ctx context.Context, userID, id string) error
	SetStatus(ctx context.Context, id, status string) error
	Delete(ctx context.Context, id string) error
}

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) List(c *gin.Context) {
	items, err := h.service.List(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, toReviewsResponse(items))
}

func (h *Handler) ListModeration(c *gin.Context) {
	items, err := h.service.ListModeration(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, toReviewsResponse(items))
}

func (h *Handler) Create(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	var request reviewRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	item, err := h.service.Create(c.Request.Context(), identity.UserID, request.Text)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusCreated, reviewResponse{Item: toReviewDTO(item)})
}

func (h *Handler) ListOwn(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	items, err := h.service.ListOwn(c.Request.Context(), identity.UserID)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, toReviewsResponse(items))
}

func (h *Handler) UpdateOwn(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	var request reviewRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	item, err := h.service.UpdateOwn(c.Request.Context(), identity.UserID, c.Param("id"), request.Text)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, reviewResponse{Item: toReviewDTO(item)})
}

func (h *Handler) DeleteOwn(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	if err := h.service.DeleteOwn(c.Request.Context(), identity.UserID, c.Param("id")); err != nil {
		_ = c.Error(err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) SetStatus(c *gin.Context) {
	var request statusRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	if err := h.service.SetStatus(c.Request.Context(), c.Param("id"), request.Status); err != nil {
		_ = c.Error(err)
		return
	}

	items, err := h.service.ListModeration(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, toReviewsResponse(items))
}

func (h *Handler) Delete(c *gin.Context) {
	if err := h.service.Delete(c.Request.Context(), c.Param("id")); err != nil {
		_ = c.Error(err)
		return
	}

	items, err := h.service.ListModeration(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, toReviewsResponse(items))
}
