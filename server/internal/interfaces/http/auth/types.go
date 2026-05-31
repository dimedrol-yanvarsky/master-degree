package auth

import (
	appauth "github.com/dimedrol-yanvarsky/master-degree/server/internal/application/auth"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
)

type registerRequest struct {
	Email      string `json:"email"`
	Password   string `json:"password"`
	Name       string `json:"name"`
	Surname    string `json:"surname"`
	Patronymic string `json:"patronymic"`
	About      string `json:"about"`
	Role       string `json:"role"`
}

func (r registerRequest) toInput() appauth.RegisterInput {
	return appauth.RegisterInput{
		Email:      r.Email,
		Password:   r.Password,
		Name:       r.Name,
		Surname:    r.Surname,
		Patronymic: r.Patronymic,
		About:      r.About,
		Role:       shared.Role(r.Role),
	}
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type userResponse struct {
	ID           string `json:"id"`
	Email        string `json:"email"`
	Name         string `json:"name"`
	Surname      string `json:"surname"`
	Patronymic   string `json:"patronymic"`
	About        string `json:"about"`
	Role         string `json:"role"`
	Status       string `json:"status"`
	YandexLinked bool   `json:"yandexLinked"`
}

func toUserResponse(v appauth.UserView) userResponse {
	return userResponse{
		ID:           v.ID,
		Email:        v.Email,
		Name:         v.Name,
		Surname:      v.Surname,
		Patronymic:   v.Patronymic,
		About:        v.About,
		Role:         string(v.Role),
		Status:       string(v.Status),
		YandexLinked: v.YandexLinked,
	}
}

type loginResponse struct {
	AccessToken string       `json:"accessToken"`
	ExpiresAt   string       `json:"expiresAt"`
	User        userResponse `json:"user"`
}
