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

type createRequestBody struct {
	TargetUserID string `json:"targetUserId" binding:"required"`
}

type respondRequestBody struct {
	Decision string `json:"decision" binding:"required"`
}

type workRequestsResponse struct {
	Items []workRequestDTO `json:"items"`
}

type workRequestResponse struct {
	Item workRequestDTO `json:"item"`
}

type workRequestDTO struct {
	ID                     string `json:"id"`
	SpecialistID           string `json:"specialistId"`
	ClientID               string `json:"clientId"`
	CounterpartID          string `json:"counterpartId"`
	CounterpartName        string `json:"counterpartName"`
	CounterpartEmail       string `json:"counterpartEmail,omitempty"`
	CounterpartRole        string `json:"counterpartRole"`
	CounterpartDescription string `json:"counterpartDescription,omitempty"`
	StartedAt              string `json:"startedAt,omitempty"`
	Status                 string `json:"status"`
	Direction              string `json:"direction"`
	CanRespond             bool   `json:"canRespond"`
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

func toWorkRequestsResponse(items []domaincollaboration.WorkRequest) workRequestsResponse {
	response := workRequestsResponse{Items: make([]workRequestDTO, 0, len(items))}
	for _, item := range items {
		response.Items = append(response.Items, toWorkRequestDTO(item))
	}
	return response
}

func toWorkRequestResponse(item domaincollaboration.WorkRequest) workRequestResponse {
	return workRequestResponse{Item: toWorkRequestDTO(item)}
}

func toWorkRequestDTO(item domaincollaboration.WorkRequest) workRequestDTO {
	startedAt := ""
	if !item.StartedAt.IsZero() {
		startedAt = item.StartedAt.Format(time.RFC3339)
	}
	return workRequestDTO{
		ID:                     item.ID,
		SpecialistID:           item.SpecialistID,
		ClientID:               item.ClientID,
		CounterpartID:          item.CounterpartID,
		CounterpartName:        item.CounterpartName,
		CounterpartEmail:       item.CounterpartEmail,
		CounterpartRole:        item.CounterpartRole,
		CounterpartDescription: item.CounterpartDescription,
		StartedAt:              startedAt,
		Status:                 string(item.Status),
		Direction:              item.Direction,
		CanRespond:             item.CanRespond,
	}
}
