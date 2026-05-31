package security

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

// Ошибки токена, передаваемые в middleware аутентификации (отображаются в HTTP 401).
var (
	ErrInvalidToken = errors.New("security: invalid token")
	ErrExpiredToken = errors.New("security: token expired")
)

// Claims — полезная нагрузка токена доступа. По РПЗ §3.2 содержит только
// нечувствительные идентификаторы; каждое решение о доступе перепроверяется
// на сервере.
type Claims struct {
	UserID    string `json:"sub"`
	SessionID string `json:"sid"`
	Role      string `json:"role"`
	IssuedAt  int64  `json:"iat"`
	ExpiresAt int64  `json:"exp"`
}

// TokenIssuer выпускает и проверяет компактные токены HMAC-SHA256 (JWT, alg
// «HS256»). Использует только стандартную библиотеку, без лишних зависимостей.
type TokenIssuer struct {
	secret []byte
	ttl    time.Duration
	now    func() time.Time
}

// NewTokenIssuer создаёт издателя с секретом подписи и TTL токена доступа.
func NewTokenIssuer(secret string, ttl time.Duration) *TokenIssuer {
	return &TokenIssuer{
		secret: []byte(secret),
		ttl:    ttl,
		now:    time.Now,
	}
}

var jwtHeader = base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"HS256","typ":"JWT"}`))

// Issue возвращает подписанный токен для указанной личности.
func (i *TokenIssuer) Issue(userID, sessionID, role string) (string, error) {
	now := i.now()
	claims := Claims{
		UserID:    userID,
		SessionID: sessionID,
		Role:      role,
		IssuedAt:  now.Unix(),
		ExpiresAt: now.Add(i.ttl).Unix(),
	}

	payloadJSON, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}

	signingInput := jwtHeader + "." + base64.RawURLEncoding.EncodeToString(payloadJSON)
	signature := i.sign(signingInput)

	return signingInput + "." + signature, nil
}

// Verify проверяет подпись и срок действия, возвращая разобранные claims.
func (i *TokenIssuer) Verify(token string) (Claims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return Claims{}, ErrInvalidToken
	}

	signingInput := parts[0] + "." + parts[1]
	expected := i.sign(signingInput)
	if !hmac.Equal([]byte(expected), []byte(parts[2])) {
		return Claims{}, ErrInvalidToken
	}

	payloadJSON, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return Claims{}, ErrInvalidToken
	}

	var claims Claims
	if err := json.Unmarshal(payloadJSON, &claims); err != nil {
		return Claims{}, ErrInvalidToken
	}

	if i.now().Unix() >= claims.ExpiresAt {
		return Claims{}, ErrExpiredToken
	}

	return claims, nil
}

func (i *TokenIssuer) sign(input string) string {
	mac := hmac.New(sha256.New, i.secret)
	mac.Write([]byte(input))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
