package collaboration

import (
	"context"
	"net/http"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/adapters/http/middleware"
	domaincollaboration "github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/collaboration"
	"github.com/gin-gonic/gin"
)

type Service interface {
	ListClientSpecialists(ctx context.Context, userID string) ([]domaincollaboration.ClientSpecialist, error)
	CreateRequest(ctx context.Context, actorID, targetID string) (domaincollaboration.WorkRequest, error)
	ListWorkRequests(ctx context.Context, userID string) ([]domaincollaboration.WorkRequest, error)
	RespondToRequest(ctx context.Context, userID, requestID, decision string) (domaincollaboration.WorkRequest, error)
	FinishCollaboration(ctx context.Context, userID, collaborationID string) (domaincollaboration.WorkRequest, error)
}

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) ListClientSpecialists(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	items, err := h.service.ListClientSpecialists(c.Request.Context(), identity.UserID)
	if err != nil {
		_ = c.Error(err)
		return
	}

	c.JSON(http.StatusOK, toClientSpecialistsResponse(items))
}

func (h *Handler) CreateRequest(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	var request createRequestBody
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	item, err := h.service.CreateRequest(c.Request.Context(), identity.UserID, request.TargetUserID)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusCreated, toWorkRequestResponse(item))
}

func (h *Handler) ListWorkRequests(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	items, err := h.service.ListWorkRequests(c.Request.Context(), identity.UserID)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, toWorkRequestsResponse(items))
}

func (h *Handler) RespondToRequest(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	var request respondRequestBody
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	item, err := h.service.RespondToRequest(c.Request.Context(), identity.UserID, c.Param("id"), request.Decision)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, toWorkRequestResponse(item))
}

func (h *Handler) FinishCollaboration(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	item, err := h.service.FinishCollaboration(c.Request.Context(), identity.UserID, c.Param("id"))
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, toWorkRequestResponse(item))
}
