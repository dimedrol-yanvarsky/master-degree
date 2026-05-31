package auth

import "github.com/gin-gonic/gin"

// RegisterPublicRoutes монтирует эндпоинты, доступные без аутентификации.
func RegisterPublicRoutes(group *gin.RouterGroup, handler *Handler) {
	group.POST("/auth/register", handler.Register)
	group.POST("/auth/login", handler.Login)
	group.GET("/auth/oauth/yandex/login", handler.OAuthYandexLogin)
	group.GET("/auth/oauth/yandex/callback", handler.OAuthYandexCallback)
}

// RegisterProtectedRoutes монтирует эндпоинты, требующие действующей сессии.
// На группу уже должен быть навешен middleware Auth.
func RegisterProtectedRoutes(group *gin.RouterGroup, handler *Handler) {
	group.POST("/auth/logout", handler.Logout)
	group.GET("/auth/me", handler.Me)
}
