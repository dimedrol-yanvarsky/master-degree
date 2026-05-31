package collaboration

import (
	"context"
	"net/http"

	domaincollaboration "github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/collaboration"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/interfaces/http/middleware"
	"github.com/gin-gonic/gin"
)

type Service interface {
	ListClientSpecialists(ctx context.Context, userID string) ([]domaincollaboration.ClientSpecialist, error)
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
