package middleware

import (
	"context"
	"strings"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/auth"
	"github.com/gin-gonic/gin"
)

const identityContextKey = "identity"

// Authenticator восстанавливает личность по токену доступа (реализуется auth.Service).
type Authenticator interface {
	Authenticate(ctx context.Context, token string) (auth.Identity, error)
}

// Auth — middleware защиты маршрутов: требует действующий Bearer-токен и кладёт
// восстановленную личность в контекст запроса. Отсутствующий/неверный токен
// даёт 401, заблокированный аккаунт — 403 (отображает ErrorHandler).
func Auth(authenticator Authenticator) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := bearerToken(c.GetHeader("Authorization"))
		if token == "" {
			_ = c.Error(shared.ErrUnauthorized)
			c.Abort()
			return
		}

		identity, err := authenticator.Authenticate(c.Request.Context(), token)
		if err != nil {
			_ = c.Error(err)
			c.Abort()
			return
		}

		c.Set(identityContextKey, identity)
		c.Next()
	}
}

// RoleGuard ограничивает маршрут указанными ролями. Выполняется после Auth.
func RoleGuard(roles ...shared.Role) gin.HandlerFunc {
	allowed := make(map[shared.Role]struct{}, len(roles))
	for _, role := range roles {
		allowed[role] = struct{}{}
	}

	return func(c *gin.Context) {
		identity, ok := IdentityFrom(c)
		if !ok {
			_ = c.Error(shared.ErrUnauthorized)
			c.Abort()
			return
		}
		if _, permitted := allowed[identity.Role]; !permitted {
			_ = c.Error(shared.ErrForbidden)
			c.Abort()
			return
		}
		c.Next()
	}
}

// IdentityFrom извлекает аутентифицированную личность из контекста.
func IdentityFrom(c *gin.Context) (auth.Identity, bool) {
	value, exists := c.Get(identityContextKey)
	if !exists {
		return auth.Identity{}, false
	}
	identity, ok := value.(auth.Identity)
	return identity, ok
}

func bearerToken(header string) string {
	const prefix = "Bearer "
	if len(header) > len(prefix) && strings.EqualFold(header[:len(prefix)], prefix) {
		return strings.TrimSpace(header[len(prefix):])
	}
	return ""
}
