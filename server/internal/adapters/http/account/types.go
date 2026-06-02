package account

import (
	"strings"
	"time"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/user"
	appaccount "github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/account"
)

type usersResponse struct {
	Items []userDTO `json:"items"`
}

type userDTO struct {
	ID         string `json:"id"`
	Email      string `json:"email"`
	Name       string `json:"name"`
	Surname    string `json:"surname"`
	Patronymic string `json:"patronymic"`
	About      string `json:"about"`
	Role       string `json:"role"`
	Status     string `json:"status"`
	CreatedAt  string `json:"createdAt"`
}

type statusRequest struct {
	Status string `json:"status"`
}

type createUserRequest struct {
	Email      string `json:"email"`
	Name       string `json:"name"`
	Surname    string `json:"surname"`
	Patronymic string `json:"patronymic"`
	Role       string `json:"role"`
}

func (r createUserRequest) toInput() appaccount.CreateUserInput {
	return appaccount.CreateUserInput{
		Email:      r.Email,
		Name:       r.Name,
		Surname:    r.Surname,
		Patronymic: r.Patronymic,
		Role:       shared.Role(r.Role),
	}
}

func toUsersResponse(items []user.User) usersResponse {
	response := usersResponse{Items: make([]userDTO, 0, len(items))}
	for _, item := range items {
		createdAt := ""
		if !item.CreatedAt.IsZero() {
			createdAt = item.CreatedAt.Format(time.RFC3339)
		}
		response.Items = append(response.Items, userDTO{
			ID:         item.ID,
			Email:      item.Email,
			Name:       item.Name,
			Surname:    item.Surname,
			Patronymic: item.Patronymic,
			About:      item.About,
			Role:       string(item.Role),
			Status:     string(item.Status),
			CreatedAt:  createdAt,
		})
	}
	return response
}

func displayName(item userDTO) string {
	return strings.Join(nonEmpty(item.Surname, item.Name, item.Patronymic), " ")
}

func nonEmpty(values ...string) []string {
	result := make([]string, 0, len(values))
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}
