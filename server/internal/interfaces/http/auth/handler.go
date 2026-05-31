package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"net/url"
	"time"

	appauth "github.com/dimedrol-yanvarsky/master-degree/server/internal/application/auth"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/interfaces/http/middleware"
	"github.com/gin-gonic/gin"
)

const oauthStateCookie = "oauth_state"

// Service — граница приложения, потребляемая обработчиком auth.
type Service interface {
	Register(ctx context.Context, in appauth.RegisterInput) (appauth.UserView, error)
	Login(ctx context.Context, in appauth.LoginInput) (appauth.LoginResult, error)
	Logout(ctx context.Context, sessionID string) error
	Profile(ctx context.Context, userID string) (appauth.UserView, error)
	OAuthLoginURL(state string) (string, error)
	OAuthCallback(ctx context.Context, code, userAgent, ip string) (appauth.LoginResult, error)
}

// Handler публикует HTTP-эндпоинты аккаунтов и аутентификации.
type Handler struct {
	service     Service
	frontendURL string
}

// NewHandler собирает обработчик auth с его сервисом. frontendURL — адрес SPA,
// куда возвращается пользователь после внешнего входа.
func NewHandler(service Service, frontendURL string) *Handler {
	return &Handler{service: service, frontendURL: frontendURL}
}

// Register обрабатывает POST /auth/register.
func (h *Handler) Register(c *gin.Context) {
	var request registerRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	view, err := h.service.Register(c.Request.Context(), request.toInput())
	if err != nil {
		_ = c.Error(err)
		return
	}

	c.JSON(http.StatusCreated, toUserResponse(view))
}

// Login обрабатывает POST /auth/login.
func (h *Handler) Login(c *gin.Context) {
	var request loginRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	result, err := h.service.Login(c.Request.Context(), appauth.LoginInput{
		Email:     request.Email,
		Password:  request.Password,
		UserAgent: c.Request.UserAgent(),
		IP:        c.ClientIP(),
	})
	if err != nil {
		_ = c.Error(err)
		return
	}

	c.JSON(http.StatusOK, loginResponse{
		AccessToken: result.AccessToken,
		ExpiresAt:   result.ExpiresAt.Format(time.RFC3339),
		User:        toUserResponse(result.User),
	})
}

// Logout обрабатывает POST /auth/logout (защищённый).
func (h *Handler) Logout(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	if err := h.service.Logout(c.Request.Context(), identity.SessionID); err != nil {
		_ = c.Error(err)
		return
	}

	c.Status(http.StatusNoContent)
}

// Me обрабатывает GET /auth/me (защищённый).
func (h *Handler) Me(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	view, err := h.service.Profile(c.Request.Context(), identity.UserID)
	if err != nil {
		_ = c.Error(err)
		return
	}

	c.JSON(http.StatusOK, toUserResponse(view))
}

// OAuthYandexLogin обрабатывает GET /auth/oauth/yandex/login: ставит state-куку
// (защита от CSRF) и перенаправляет на страницу согласия Yandex.
func (h *Handler) OAuthYandexLogin(c *gin.Context) {
	state, err := randomState()
	if err != nil {
		_ = c.Error(err)
		return
	}

	loginURL, err := h.service.OAuthLoginURL(state)
	if err != nil {
		_ = c.Error(err)
		return
	}

	// HttpOnly-кука на 5 минут; в проде secure=true (HTTPS).
	c.SetCookie(oauthStateCookie, state, 300, "/", "", false, true)
	c.Redirect(http.StatusFound, loginURL)
}

// OAuthYandexCallback обрабатывает GET /auth/oauth/yandex/callback: сверяет state,
// меняет код на сессию и возвращает пользователя в SPA с токеном во фрагменте URL.
func (h *Handler) OAuthYandexCallback(c *gin.Context) {
	if errParam := c.Query("error"); errParam != "" {
		c.Redirect(http.StatusFound, h.frontendRedirect("/login", "oauth_error=denied"))
		return
	}

	code := c.Query("code")
	state := c.Query("state")
	cookieState, _ := c.Cookie(oauthStateCookie)
	c.SetCookie(oauthStateCookie, "", -1, "/", "", false, true) // одноразовая кука

	if code == "" || state == "" || cookieState == "" || state != cookieState {
		c.Redirect(http.StatusFound, h.frontendRedirect("/login", "oauth_error=state"))
		return
	}

	result, err := h.service.OAuthCallback(c.Request.Context(), code, c.Request.UserAgent(), c.ClientIP())
	if err != nil {
		c.Redirect(http.StatusFound, h.frontendRedirect("/login", "oauth_error=exchange"))
		return
	}

	// Токен передаём во фрагменте (#...): он не попадает в логи сервера и Referer.
	fragment := "access_token=" + url.QueryEscape(result.AccessToken) +
		"&expires_at=" + url.QueryEscape(result.ExpiresAt.Format(time.RFC3339))
	c.Redirect(http.StatusFound, h.frontendURL+"/login#"+fragment)
}

func (h *Handler) frontendRedirect(path, query string) string {
	if query == "" {
		return h.frontendURL + path
	}
	return h.frontendURL + path + "?" + query
}

func randomState() (string, error) {
	buffer := make([]byte, 16)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	return hex.EncodeToString(buffer), nil
}
