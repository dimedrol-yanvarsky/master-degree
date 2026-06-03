package recommendation

import (
	"context"
	"net/http"
	"strconv"
	"strings"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/adapters/http/middleware"
	domainrecommendation "github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/recommendation"
	apprecommendation "github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/recommendation"
	"github.com/gin-gonic/gin"
)

const recommendationItemsPerPage = 20

type Service interface {
	List(ctx context.Context) ([]domainrecommendation.Block, error)
	CreateSection(ctx context.Context, authorID, parentID, title, number string) (domainrecommendation.Block, error)
	CreateBlock(ctx context.Context, authorID, sectionID, text string) (domainrecommendation.Block, error)
	UpdateSection(ctx context.Context, id, title string) (domainrecommendation.Block, error)
	UpdateBlock(ctx context.Context, id, text string) (domainrecommendation.Block, error)
	DeleteSection(ctx context.Context, id string) error
	DeleteBlock(ctx context.Context, id string) error
	AssignToClient(ctx context.Context, specialistID, clientID, text string) (apprecommendation.AssignmentView, error)
	ListClientAssignments(ctx context.Context, clientID string) ([]apprecommendation.AssignmentView, error)
	ListSpecialistAssignments(ctx context.Context, specialistID string) ([]apprecommendation.AssignmentView, error)
	DeleteAssignment(ctx context.Context, specialistID, assignmentID string) error
}

var _ Service = (*apprecommendation.Service)(nil)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) List(c *gin.Context) {
	if page, ok := readPageQuery(c.Query("page")); ok {
		h.respondTreePage(c, http.StatusOK, page)
		return
	}
	h.respondTree(c, http.StatusOK)
}

func (h *Handler) CreateSection(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	var request sectionRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}
	if _, err := h.service.CreateSection(c.Request.Context(), identity.UserID, request.ParentID, request.Title, request.Number); err != nil {
		_ = c.Error(err)
		return
	}
	h.respondTree(c, http.StatusCreated)
}

func (h *Handler) CreateBlock(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	var request blockRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}
	if _, err := h.service.CreateBlock(c.Request.Context(), identity.UserID, request.SectionID, encodeBlockText(request)); err != nil {
		_ = c.Error(err)
		return
	}
	h.respondTree(c, http.StatusCreated)
}

func (h *Handler) UpdateSection(c *gin.Context) {
	var request sectionRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}
	if _, err := h.service.UpdateSection(c.Request.Context(), c.Param("id"), request.Title); err != nil {
		_ = c.Error(err)
		return
	}
	h.respondTree(c, http.StatusOK)
}

func (h *Handler) UpdateBlock(c *gin.Context) {
	var request blockRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}
	if _, err := h.service.UpdateBlock(c.Request.Context(), c.Param("id"), encodeBlockText(request)); err != nil {
		_ = c.Error(err)
		return
	}
	h.respondTree(c, http.StatusOK)
}

func (h *Handler) DeleteSection(c *gin.Context) {
	if err := h.service.DeleteSection(c.Request.Context(), c.Param("id")); err != nil {
		_ = c.Error(err)
		return
	}
	h.respondTree(c, http.StatusOK)
}

func (h *Handler) DeleteBlock(c *gin.Context) {
	if err := h.service.DeleteBlock(c.Request.Context(), c.Param("id")); err != nil {
		_ = c.Error(err)
		return
	}
	h.respondTree(c, http.StatusOK)
}

func (h *Handler) AssignToClient(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	var request assignmentRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	item, err := h.service.AssignToClient(c.Request.Context(), identity.UserID, request.ClientID, request.Text)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusCreated, assignmentResponse{Item: toAssignmentDTO(item)})
}

func (h *Handler) ListSpecialistAssignments(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	items, err := h.service.ListSpecialistAssignments(c.Request.Context(), identity.UserID)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, toAssignmentsResponse(items))
}

func (h *Handler) DeleteAssignment(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	if err := h.service.DeleteAssignment(c.Request.Context(), identity.UserID, c.Param("id")); err != nil {
		_ = c.Error(err)
		return
	}
	items, err := h.service.ListSpecialistAssignments(c.Request.Context(), identity.UserID)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, toAssignmentsResponse(items))
}

func (h *Handler) ListMyAssignments(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	items, err := h.service.ListClientAssignments(c.Request.Context(), identity.UserID)
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, toAssignmentsResponse(items))
}

func (h *Handler) respondTree(c *gin.Context, status int) {
	items, err := h.service.List(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(status, toTreeResponse(items))
}

func (h *Handler) respondTreePage(c *gin.Context, status int, page int) {
	items, err := h.service.List(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(status, paginateTreeResponse(toTreeResponse(items), page, recommendationItemsPerPage))
}

func readPageQuery(value string) (int, bool) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return 0, false
	}
	page, err := strconv.Atoi(trimmed)
	if err != nil || page < 1 {
		return 1, true
	}
	return page, true
}
