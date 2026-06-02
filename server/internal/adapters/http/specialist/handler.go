package specialist

import (
	"context"
	"net/http"

	domainspecialist "github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/specialist"
	"github.com/gin-gonic/gin"
)

// Service — граница приложения, потребляемая обработчиком каталога специалистов.
type Service interface {
	List(ctx context.Context) ([]domainspecialist.Profile, error)
}

// Handler публикует HTTP-эндпоинты каталога специалистов.
type Handler struct {
	service Service
}

// NewHandler собирает обработчик каталога специалистов.
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// List обрабатывает GET /specialists.
func (h *Handler) List(c *gin.Context) {
	profiles, err := h.service.List(c.Request.Context())
	if err != nil {
		_ = c.Error(err)
		return
	}

	c.JSON(http.StatusOK, listResponse{Items: toResponses(profiles)})
}
