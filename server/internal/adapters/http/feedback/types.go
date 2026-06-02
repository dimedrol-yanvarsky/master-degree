package feedback

import (
	"time"

	appfeedback "github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/feedback"
)

type reviewsResponse struct {
	Items []reviewDTO `json:"items"`
}

type reviewResponse struct {
	Item reviewDTO `json:"item"`
}

type reviewDTO struct {
	ID          string `json:"id"`
	UserID      string `json:"userId"`
	AuthorName  string `json:"authorName"`
	AuthorEmail string `json:"authorEmail,omitempty"`
	Text        string `json:"text"`
	CreatedAt   string `json:"createdAt"`
	Status      string `json:"status"`
}

type statusRequest struct {
	Status string `json:"status"`
}

type reviewRequest struct {
	Text string `json:"text"`
}

func toReviewsResponse(items []appfeedback.ReviewView) reviewsResponse {
	response := reviewsResponse{Items: make([]reviewDTO, 0, len(items))}
	for _, item := range items {
		response.Items = append(response.Items, toReviewDTO(item))
	}
	return response
}

func toReviewDTO(item appfeedback.ReviewView) reviewDTO {
	createdAt := ""
	if !item.CreatedAt.IsZero() {
		createdAt = item.CreatedAt.Format(time.RFC3339)
	}
	return reviewDTO{
		ID:          item.ID,
		UserID:      item.UserID,
		AuthorName:  firstNonEmpty(item.AuthorName, "Пользователь"),
		AuthorEmail: item.AuthorEmail,
		Text:        item.Body,
		CreatedAt:   createdAt,
		Status:      item.Status,
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}
