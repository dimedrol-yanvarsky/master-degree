package collaboration

import (
	"time"

	domaincollaboration "github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/collaboration"
)

type clientSpecialistsResponse struct {
	Items []clientSpecialistDTO `json:"items"`
}

type clientSpecialistDTO struct {
	ID           string `json:"id"`
	SpecialistID string `json:"specialistId"`
	Name         string `json:"name"`
	Experience   string `json:"experience,omitempty"`
	Description  string `json:"description,omitempty"`
	StartedAt    string `json:"startedAt,omitempty"`
	Status       string `json:"status"`
}

func toClientSpecialistsResponse(items []domaincollaboration.ClientSpecialist) clientSpecialistsResponse {
	response := clientSpecialistsResponse{Items: make([]clientSpecialistDTO, 0, len(items))}
	for _, item := range items {
		startedAt := ""
		if !item.StartedAt.IsZero() {
			startedAt = item.StartedAt.Format(time.RFC3339)
		}
		response.Items = append(response.Items, clientSpecialistDTO{
			ID:           item.ID,
			SpecialistID: item.SpecialistID,
			Name:         item.SpecialistName,
			Experience:   item.SpecialistExperience,
			Description:  item.SpecialistDescription,
			StartedAt:    startedAt,
			Status:       string(item.Status),
		})
	}
	return response
}
