package recommendation

import (
	"encoding/json"
	"sort"
	"strings"
	"time"

	domainrecommendation "github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/recommendation"
	apprecommendation "github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/recommendation"
)

type treeResponse struct {
	Items []sectionDTO `json:"items"`
}

type sectionDTO struct {
	ID          string       `json:"id"`
	Number      string       `json:"number"`
	Title       string       `json:"title"`
	Description string       `json:"description"`
	Blocks      []blockDTO   `json:"blocks"`
	Children    []sectionDTO `json:"children"`
}

type blockDTO struct {
	ID      string   `json:"id"`
	Title   string   `json:"title"`
	Summary string   `json:"summary"`
	Content string   `json:"content"`
	Tags    []string `json:"tags"`
}

type sectionRequest struct {
	ParentID    string `json:"parentId"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

type blockRequest struct {
	SectionID string   `json:"sectionId"`
	Title     string   `json:"title"`
	Summary   string   `json:"summary"`
	Content   string   `json:"content"`
	Tags      []string `json:"tags"`
}

type assignmentRequest struct {
	ClientID string `json:"clientId"`
	Text     string `json:"text"`
}

type assignmentsResponse struct {
	Items []assignmentDTO `json:"items"`
}

type assignmentResponse struct {
	Item assignmentDTO `json:"item"`
}

type assignmentDTO struct {
	ID              string `json:"id"`
	CollaborationID string `json:"collaborationId"`
	SpecialistID    string `json:"specialistId"`
	SpecialistName  string `json:"specialistName"`
	SpecialistEmail string `json:"specialistEmail,omitempty"`
	ClientID        string `json:"clientId"`
	ClientName      string `json:"clientName,omitempty"`
	ClientEmail     string `json:"clientEmail,omitempty"`
	Text            string `json:"text"`
	AssignedAt      string `json:"assignedAt"`
	Status          string `json:"status"`
}

type blockTextPayload struct {
	Title   string   `json:"title"`
	Summary string   `json:"summary,omitempty"`
	Content string   `json:"content"`
	Tags    []string `json:"tags,omitempty"`
}

func toTreeResponse(items []domainrecommendation.Block) treeResponse {
	sectionsByID := make(map[string]*sectionDTO)
	childrenByParent := make(map[string][]domainrecommendation.Block)
	blocksByParent := make(map[string][]domainrecommendation.Block)
	sortOrders := make(map[string]int)

	for _, item := range items {
		sortOrders[item.ID] = item.SortOrder
		if item.IsSection() {
			title := ""
			if item.SectionTitle != nil {
				title = *item.SectionTitle
			}
			number := ""
			if item.SectionNumber != nil {
				number = strings.TrimSpace(*item.SectionNumber)
			}
			sectionsByID[item.ID] = &sectionDTO{
				ID:       item.ID,
				Number:   number,
				Title:    title,
				Blocks:   []blockDTO{},
				Children: []sectionDTO{},
			}
			parentKey := parentID(item.ParentID)
			childrenByParent[parentKey] = append(childrenByParent[parentKey], item)
			continue
		}
		parentKey := parentID(item.ParentID)
		blocksByParent[parentKey] = append(blocksByParent[parentKey], item)
	}

	var buildSections func(parent string) []sectionDTO
	buildSections = func(parent string) []sectionDTO {
		children := childrenByParent[parent]
		sort.SliceStable(children, func(i, j int) bool {
			return children[i].SortOrder < children[j].SortOrder
		})

		out := make([]sectionDTO, 0, len(children))
		for _, child := range children {
			section := sectionsByID[child.ID]
			if section == nil {
				continue
			}
			section.Blocks = toBlockDTOs(blocksByParent[child.ID])
			section.Children = buildSections(child.ID)
			out = append(out, *section)
		}
		return out
	}

	_ = sortOrders
	return treeResponse{Items: buildSections("")}
}

func toAssignmentsResponse(items []apprecommendation.AssignmentView) assignmentsResponse {
	response := assignmentsResponse{Items: make([]assignmentDTO, 0, len(items))}
	for _, item := range items {
		response.Items = append(response.Items, toAssignmentDTO(item))
	}
	return response
}

func toAssignmentDTO(item apprecommendation.AssignmentView) assignmentDTO {
	assignedAt := ""
	if !item.AssignedAt.IsZero() {
		assignedAt = item.AssignedAt.Format(time.RFC3339)
	}

	return assignmentDTO{
		ID:              item.ID,
		CollaborationID: item.CollaborationID,
		SpecialistID:    item.SpecialistID,
		SpecialistName:  firstNonEmpty(item.SpecialistName, "Специалист"),
		SpecialistEmail: item.SpecialistEmail,
		ClientID:        item.ClientID,
		ClientName:      item.ClientName,
		ClientEmail:     item.ClientEmail,
		Text:            item.Text,
		AssignedAt:      assignedAt,
		Status:          item.Status,
	}
}

func toBlockDTOs(items []domainrecommendation.Block) []blockDTO {
	sort.SliceStable(items, func(i, j int) bool {
		return items[i].SortOrder < items[j].SortOrder
	})

	out := make([]blockDTO, 0, len(items))
	for _, item := range items {
		text := ""
		if item.Text != nil {
			text = *item.Text
		}
		out = append(out, parseBlockText(item.ID, text))
	}
	return out
}

func parseBlockText(id, text string) blockDTO {
	trimmed := strings.TrimSpace(text)

	// Структурированный блок (редактор или явно бес­заголовочные рекомендации):
	// JSON {title, summary, content, tags}. Заголовок может быть пустым — тогда блок
	// рендерится без заголовка.
	if strings.HasPrefix(trimmed, "{") {
		var payload blockTextPayload
		if err := json.Unmarshal([]byte(trimmed), &payload); err == nil {
			return blockDTO{
				ID:      id,
				Title:   strings.TrimSpace(payload.Title),
				Summary: strings.TrimSpace(payload.Summary),
				Content: strings.TrimSpace(payload.Content),
				Tags:    cleanTags(payload.Tags),
			}
		}
	}

	// Простой текст в историческом формате «Заголовок. Содержимое».
	title, content := splitPlainRecommendationText(trimmed)
	return blockDTO{
		ID:      id,
		Title:   title,
		Summary: "",
		Content: content,
		Tags:    []string{},
	}
}

func splitPlainRecommendationText(text string) (string, string) {
	trimmed := strings.TrimSpace(text)
	if trimmed == "" {
		return "", ""
	}
	if index := strings.Index(trimmed, ". "); index > 0 {
		return strings.TrimSpace(trimmed[:index]), strings.TrimSpace(trimmed[index+2:])
	}
	return trimmed, trimmed
}

func encodeBlockText(request blockRequest) string {
	payload := blockTextPayload{
		Title:   strings.TrimSpace(request.Title),
		Summary: strings.TrimSpace(request.Summary),
		Content: strings.TrimSpace(request.Content),
		Tags:    cleanTags(request.Tags),
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return strings.TrimSpace(request.Title + ". " + request.Content)
	}
	return string(raw)
}

func cleanTags(tags []string) []string {
	out := make([]string, 0, len(tags))
	for _, tag := range tags {
		if trimmed := strings.TrimSpace(tag); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func parentID(parent *string) string {
	if parent == nil {
		return ""
	}
	return strings.TrimSpace(*parent)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}
