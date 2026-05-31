// Пакет oauth — инфраструктурные адаптеры внешних провайдеров входа. Здесь живёт
// реализация Yandex OAuth2 (authorization code) без внешних зависимостей: только
// стандартная библиотека. Секреты приходят из конфигурации (config.YandexOAuthConfig).
package oauth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/application/port"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
)

const (
	yandexAuthorizeURL = "https://oauth.yandex.ru/authorize"
	yandexTokenURL     = "https://oauth.yandex.ru/token"
	yandexUserInfoURL  = "https://login.yandex.ru/info"
)

// Проверка на этапе компиляции: провайдер удовлетворяет порту приложения.
var _ port.OAuthProvider = (*YandexProvider)(nil)

// YandexProvider реализует поток Yandex OAuth2.
type YandexProvider struct {
	clientID     string
	clientSecret string
	redirectURL  string
	httpClient   *http.Client
}

// NewYandexProvider собирает провайдер. Пустые clientID/clientSecret оставляют
// его «не настроенным»: эндпоинты OAuth вернут ошибку, не роняя сервер.
func NewYandexProvider(clientID, clientSecret, redirectURL string) *YandexProvider {
	return &YandexProvider{
		clientID:     strings.TrimSpace(clientID),
		clientSecret: strings.TrimSpace(clientSecret),
		redirectURL:  strings.TrimSpace(redirectURL),
		httpClient:   &http.Client{Timeout: 10 * time.Second},
	}
}

// Configured сообщает, заданы ли секреты приложения.
func (p *YandexProvider) Configured() bool {
	return p.clientID != "" && p.clientSecret != ""
}

// AuthCodeURL строит ссылку на страницу согласия Yandex.
func (p *YandexProvider) AuthCodeURL(state string) string {
	query := url.Values{}
	query.Set("response_type", "code")
	query.Set("client_id", p.clientID)
	if p.redirectURL != "" {
		query.Set("redirect_uri", p.redirectURL)
	}
	if state != "" {
		query.Set("state", state)
	}
	return yandexAuthorizeURL + "?" + query.Encode()
}

// Exchange меняет authorization code на токен и читает профиль пользователя.
func (p *YandexProvider) Exchange(ctx context.Context, code string) (port.OAuthIdentity, error) {
	if !p.Configured() {
		return port.OAuthIdentity{}, fmt.Errorf("%w: yandex oauth is not configured", shared.ErrForbidden)
	}

	token, err := p.exchangeCode(ctx, code)
	if err != nil {
		return port.OAuthIdentity{}, err
	}
	return p.fetchUserInfo(ctx, token)
}

func (p *YandexProvider) exchangeCode(ctx context.Context, code string) (string, error) {
	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("code", strings.TrimSpace(code))
	form.Set("client_id", p.clientID)
	form.Set("client_secret", p.clientSecret)
	if p.redirectURL != "" {
		form.Set("redirect_uri", p.redirectURL)
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, yandexTokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	response, err := p.httpClient.Do(request)
	if err != nil {
		return "", err
	}
	defer response.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(response.Body, 1<<20))
	if response.StatusCode != http.StatusOK {
		return "", fmt.Errorf("%w: yandex token endpoint returned %d", shared.ErrUnauthorized, response.StatusCode)
	}

	var payload struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return "", err
	}
	if payload.AccessToken == "" {
		return "", fmt.Errorf("%w: yandex returned an empty access token", shared.ErrUnauthorized)
	}
	return payload.AccessToken, nil
}

func (p *YandexProvider) fetchUserInfo(ctx context.Context, token string) (port.OAuthIdentity, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, yandexUserInfoURL+"?format=json", nil)
	if err != nil {
		return port.OAuthIdentity{}, err
	}
	request.Header.Set("Authorization", "OAuth "+token)

	response, err := p.httpClient.Do(request)
	if err != nil {
		return port.OAuthIdentity{}, err
	}
	defer response.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(response.Body, 1<<20))
	if response.StatusCode != http.StatusOK {
		return port.OAuthIdentity{}, fmt.Errorf("%w: yandex userinfo returned %d", shared.ErrUnauthorized, response.StatusCode)
	}

	var info struct {
		ID           string `json:"id"`
		DefaultEmail string `json:"default_email"`
		FirstName    string `json:"first_name"`
		LastName     string `json:"last_name"`
	}
	if err := json.Unmarshal(body, &info); err != nil {
		return port.OAuthIdentity{}, err
	}

	return port.OAuthIdentity{
		ProviderUserID: info.ID,
		Email:          strings.TrimSpace(info.DefaultEmail),
		Name:           strings.TrimSpace(info.FirstName),
		Surname:        strings.TrimSpace(info.LastName),
	}, nil
}
