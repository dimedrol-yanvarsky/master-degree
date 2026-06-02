package specialist

import domainspecialist "github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/specialist"

type listResponse struct {
	Items []profileResponse `json:"items"`
}

type profileResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Experience  string `json:"experience"`
	Description string `json:"description"`
	Color       string `json:"color"`
}

func toResponses(profiles []domainspecialist.Profile) []profileResponse {
	responses := make([]profileResponse, 0, len(profiles))
	for _, profile := range profiles {
		responses = append(responses, profileResponse{
			ID:          profile.ID,
			Name:        profile.Name,
			Experience:  profile.Experience,
			Description: profile.Description,
			Color:       profile.Color,
		})
	}
	return responses
}
