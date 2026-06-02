package account

import (
	"context"
	"net/http"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/user"
	appaccount "github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/account"
	"github.com/gin-gonic/gin"
)

type Service interface {
	ListUsers(ctx context.Context) ([]user.User, error)
	ListClients(ctx context.Context) ([]user.User, error)
	CreateUser(ctx context.Context, in appaccount.CreateUserInput) (user.User, error)
	SetUserStatus(ctx context.Context, id string, status shared.AccountStatus) error
}

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) ListUsers(c *gin.Context) {
	items, err := h.service.ListUsers(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, toUsersResponse(items))
}

func (h *Handler) ListClients(c *gin.Context) {
	items, err := h.service.ListClients(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, toUsersResponse(items))
}

func (h *Handler) CreateUser(c *gin.Context) {
	var request createUserRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	if _, err := h.service.CreateUser(c.Request.Context(), request.toInput()); err != nil {
		_ = c.Error(err)
		return
	}
	items, err := h.service.ListUsers(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusCreated, toUsersResponse(items))
}

func (h *Handler) SetUserStatus(c *gin.Context) {
	var request statusRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	if err := h.service.SetUserStatus(c.Request.Context(), c.Param("id"), shared.AccountStatus(request.Status)); err != nil {
		_ = c.Error(err)
		return
	}
	items, err := h.service.ListUsers(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, toUsersResponse(items))
}

func (h *Handler) DeleteUser(c *gin.Context) {
	if err := h.service.SetUserStatus(c.Request.Context(), c.Param("id"), shared.AccountDeleted); err != nil {
		_ = c.Error(err)
		return
	}
	items, err := h.service.ListUsers(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, toUsersResponse(items))
}
