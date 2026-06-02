package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/adapters/http/middleware"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	appauth "github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/auth"
	"github.com/gin-gonic/gin"
)

const oauthStateCookie = "oauth_state"
const oauthLinkStatePrefix = "link:"

// Service — граница приложения, потребляемая обработчиком auth.
type Service interface {
	Register(ctx context.Context, in appauth.RegisterInput) (appauth.UserView, error)
	Login(ctx context.Context, in appauth.LoginInput) (appauth.LoginResult, error)
	Logout(ctx context.Context, sessionID string) error
	Profile(ctx context.Context, userID string) (appauth.UserView, error)
	UpdateProfile(ctx context.Context, userID string, in appauth.UpdateProfileInput) (appauth.UserView, error)
	ChangePassword(ctx context.Context, userID string, in appauth.ChangePasswordInput) error
	RequestPasswordReset(ctx context.Context, in appauth.RequestPasswordResetInput) error
	ConfirmPasswordReset(ctx context.Context, in appauth.ConfirmPasswordResetInput) error
	UnlinkYandex(ctx context.Context, userID string) (appauth.UserView, error)
	DeleteAccount(ctx context.Context, userID string) error
	OAuthLoginURL(state string) (string, error)
	OAuthCallback(ctx context.Context, code, userAgent, ip string) (appauth.LoginResult, error)
	OAuthLinkCallback(ctx context.Context, userID, code string) (appauth.UserView, error)
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
// RequestPasswordReset обрабатывает POST /auth/password-reset.
func (h *Handler) RequestPasswordReset(c *gin.Context) {
	var request passwordResetRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	if err := h.service.RequestPasswordReset(c.Request.Context(), request.toInput()); err != nil {
		_ = c.Error(err)
		return
	}

	c.JSON(http.StatusAccepted, passwordResetResponse{
		Message: "Если аккаунт существует, инструкция по восстановлению отправлена.",
	})
}

// ConfirmPasswordReset обрабатывает POST /auth/password-reset/confirm.
func (h *Handler) ConfirmPasswordReset(c *gin.Context) {
	var request passwordResetConfirmRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	if err := h.service.ConfirmPasswordReset(c.Request.Context(), request.toInput()); err != nil {
		_ = c.Error(err)
		return
	}

	c.Status(http.StatusNoContent)
}

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

// UpdateMe обрабатывает PATCH /auth/me (защищённый).
func (h *Handler) UpdateMe(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	var request updateProfileRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	view, err := h.service.UpdateProfile(c.Request.Context(), identity.UserID, request.toInput())
	if err != nil {
		_ = c.Error(err)
		return
	}

	c.JSON(http.StatusOK, toUserResponse(view))
}

// ChangePassword обрабатывает PATCH /auth/me/password (защищённый).
func (h *Handler) ChangePassword(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	var request changePasswordRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	if err := h.service.ChangePassword(c.Request.Context(), identity.UserID, request.toInput()); err != nil {
		_ = c.Error(err)
		return
	}

	c.Status(http.StatusNoContent)
}

// DeleteMe обрабатывает DELETE /auth/me (защищённый).
func (h *Handler) DeleteMe(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	if err := h.service.DeleteAccount(c.Request.Context(), identity.UserID); err != nil {
		_ = c.Error(err)
		return
	}

	c.Status(http.StatusNoContent)
}

// OAuthYandexLinkStart начинает защищённый сценарий привязки Yandex к текущему аккаунту.
func (h *Handler) OAuthYandexLinkStart(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	state, err := randomLinkState(identity.UserID)
	if err != nil {
		_ = c.Error(err)
		return
	}

	loginURL, err := h.service.OAuthLoginURL(state)
	if err != nil {
		_ = c.Error(err)
		return
	}

	c.SetCookie(oauthStateCookie, state, 300, "/", "", false, true)
	c.JSON(http.StatusOK, oauthLinkStartResponse{RedirectURL: loginURL})
}

// UnlinkYandex обрабатывает DELETE /auth/me/yandex-link (защищённый).
func (h *Handler) UnlinkYandex(c *gin.Context) {
	identity, ok := middleware.IdentityFrom(c)
	if !ok {
		c.Status(http.StatusUnauthorized)
		return
	}

	view, err := h.service.UnlinkYandex(c.Request.Context(), identity.UserID)
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

	if userID, ok := linkUserIDFromState(state); ok {
		if _, err := h.service.OAuthLinkCallback(c.Request.Context(), userID, code); err != nil {
			c.Redirect(http.StatusFound, h.frontendRedirect("/account", "oauth_link_error="+oauthLinkError(err)))
			return
		}

		c.Redirect(http.StatusFound, h.frontendRedirect("/account", "oauth_link=success"))
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

func randomLinkState(userID string) (string, error) {
	state, err := randomState()
	if err != nil {
		return "", err
	}
	return oauthLinkStatePrefix + url.QueryEscape(userID) + ":" + state, nil
}

func linkUserIDFromState(state string) (string, bool) {
	if !strings.HasPrefix(state, oauthLinkStatePrefix) {
		return "", false
	}

	rest := strings.TrimPrefix(state, oauthLinkStatePrefix)
	parts := strings.SplitN(rest, ":", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", false
	}

	userID, err := url.QueryUnescape(parts[0])
	if err != nil || userID == "" {
		return "", false
	}
	return userID, true
}

func oauthLinkError(err error) string {
	switch {
	case errors.Is(err, shared.ErrValidation), errors.Is(err, shared.ErrConflict):
		return "email"
	case errors.Is(err, shared.ErrForbidden):
		return "forbidden"
	default:
		return "exchange"
	}
}
