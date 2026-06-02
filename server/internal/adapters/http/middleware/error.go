package middleware

import (
	"errors"
	"net/http"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	"github.com/gin-gonic/gin"
)

// ErrorHandler преобразует доменные ошибки, собранные через c.Error(...), в
// HTTP-ответы. Сопоставление ошибок-сигналов здесь держит use case вне
// транспорта и даёт различие 401/403, требуемое РПЗ §3.3.
func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		if len(c.Errors) == 0 || c.Writer.Written() {
			return
		}

		err := c.Errors.Last().Err
		status, message := mapError(err)
		c.JSON(status, gin.H{"error": message})
	}
}

func mapError(err error) (int, string) {
	switch {
	case errors.Is(err, shared.ErrValidation):
		return http.StatusBadRequest, err.Error()
	case errors.Is(err, shared.ErrUnauthorized):
		return http.StatusUnauthorized, "authentication required"
	case errors.Is(err, shared.ErrForbidden):
		return http.StatusForbidden, "access denied"
	case errors.Is(err, shared.ErrNotFound):
		return http.StatusNotFound, "resource not found"
	case errors.Is(err, shared.ErrConflict):
		return http.StatusConflict, err.Error()
	default:
		return http.StatusInternalServerError, "internal server error"
	}
}
