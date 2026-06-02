package auth

import "github.com/gin-gonic/gin"

// RegisterPublicRoutes монтирует эндпоинты, доступные без аутентификации.
func RegisterPublicRoutes(group *gin.RouterGroup, handler *Handler) {
	group.POST("/auth/register", handler.Register)
	group.POST("/auth/login", handler.Login)
	group.POST("/auth/password-reset", handler.RequestPasswordReset)
	group.POST("/auth/password-reset/confirm", handler.ConfirmPasswordReset)
	group.GET("/auth/oauth/yandex/login", handler.OAuthYandexLogin)
	group.GET("/auth/oauth/yandex/callback", handler.OAuthYandexCallback)
}

// RegisterProtectedRoutes монтирует эндпоинты, требующие действующей сессии.
// На группу уже должен быть навешен middleware Auth.
func RegisterProtectedRoutes(group *gin.RouterGroup, handler *Handler) {
	group.POST("/auth/logout", handler.Logout)
	group.GET("/auth/me", handler.Me)
	group.PATCH("/auth/me", handler.UpdateMe)
	group.DELETE("/auth/me", handler.DeleteMe)
	group.PATCH("/auth/me/password", handler.ChangePassword)
	group.POST("/auth/oauth/yandex/link", handler.OAuthYandexLinkStart)
	group.DELETE("/auth/me/yandex-link", handler.UnlinkYandex)
}
