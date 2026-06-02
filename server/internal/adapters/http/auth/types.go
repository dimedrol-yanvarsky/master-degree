package auth

import (
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	appauth "github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/auth"
)

type registerRequest struct {
	Email      string `json:"email"`
	Password   string `json:"password"`
	Name       string `json:"name"`
	Surname    string `json:"surname"`
	Patronymic string `json:"patronymic"`
	About      string `json:"about"`
	Experience string `json:"experience"`
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
		Experience: r.Experience,
		Role:       shared.Role(r.Role),
	}
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type updateProfileRequest struct {
	Email      string `json:"email"`
	Name       string `json:"name"`
	Surname    string `json:"surname"`
	Patronymic string `json:"patronymic"`
	About      string `json:"about"`
	Experience string `json:"experience"`
}

func (r updateProfileRequest) toInput() appauth.UpdateProfileInput {
	return appauth.UpdateProfileInput{
		Email:      r.Email,
		Name:       r.Name,
		Surname:    r.Surname,
		Patronymic: r.Patronymic,
		About:      r.About,
		Experience: r.Experience,
	}
}

type changePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

func (r changePasswordRequest) toInput() appauth.ChangePasswordInput {
	return appauth.ChangePasswordInput{
		CurrentPassword: r.CurrentPassword,
		NewPassword:     r.NewPassword,
	}
}

type passwordResetRequest struct {
	Email string `json:"email"`
}

func (r passwordResetRequest) toInput() appauth.RequestPasswordResetInput {
	return appauth.RequestPasswordResetInput{Email: r.Email}
}

type passwordResetConfirmRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"newPassword"`
}

func (r passwordResetConfirmRequest) toInput() appauth.ConfirmPasswordResetInput {
	return appauth.ConfirmPasswordResetInput{
		Token:       r.Token,
		NewPassword: r.NewPassword,
	}
}

type passwordResetResponse struct {
	Message string `json:"message"`
}

type oauthLinkStartResponse struct {
	RedirectURL string `json:"redirectUrl"`
}

type userResponse struct {
	ID           string `json:"id"`
	Email        string `json:"email"`
	Name         string `json:"name"`
	Surname      string `json:"surname"`
	Patronymic   string `json:"patronymic"`
	About        string `json:"about"`
	Experience   string `json:"experience"`
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
		Experience:   v.Experience,
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
