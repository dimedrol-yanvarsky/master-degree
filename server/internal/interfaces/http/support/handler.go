package support

import (
	"context"
	"net/http"

	appsupport "github.com/dimedrol-yanvarsky/master-degree/server/internal/application/support"
	"github.com/gin-gonic/gin"
)

// CalculateUseCase — граница приложения, потребляемая обработчиком.
type CalculateUseCase interface {
	Calculate(ctx context.Context, in appsupport.Input) (appsupport.Output, error)
}

// Handler публикует расчёт потребности в поддержке по HTTP.
type Handler struct {
	calculate CalculateUseCase
}

// NewHandler собирает обработчик с его use case.
func NewHandler(calculate CalculateUseCase) *Handler {
	return &Handler{calculate: calculate}
}

// Calculate обрабатывает POST /support/calculate.
func (h *Handler) Calculate(c *gin.Context) {
	var request calculateRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	out, err := h.calculate.Calculate(c.Request.Context(), request.toInput())
	if err != nil {
		_ = c.Error(err) // статус выставит middleware.ErrorHandler
		return
	}

	c.JSON(http.StatusOK, toResponse(out))
}
