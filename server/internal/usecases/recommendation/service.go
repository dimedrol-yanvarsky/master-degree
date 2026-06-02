package recommendation

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	domainrecommendation "github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/recommendation"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/user"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
)

const assignmentStatusActive = "active"

type Deps struct {
	Repository     port.RecommendationRepository
	Assignments    port.RecommendationAssignmentRepository
	Collaborations port.CollaborationRepository
	Users          port.UserRepository
	IDs            port.IDGenerator
	Clock          port.Clock
}

type Service struct {
	deps Deps
}

type AssignmentView struct {
	domainrecommendation.Assignment
	SpecialistName  string
	SpecialistEmail string
	ClientName      string
	ClientEmail     string
}

func NewService(deps Deps) *Service {
	return &Service{deps: deps}
}

func (s *Service) List(ctx context.Context) ([]domainrecommendation.Block, error) {
	if s.deps.Repository == nil {
		return []domainrecommendation.Block{}, nil
	}

	items, err := s.deps.Repository.List(ctx)
	if errors.Is(err, shared.ErrNotFound) {
		return []domainrecommendation.Block{}, nil
	}
	if err != nil {
		return nil, err
	}

	sort.SliceStable(items, func(i, j int) bool {
		if sameParent(items[i].ParentID, items[j].ParentID) {
			return items[i].SortOrder < items[j].SortOrder
		}
		return parentKey(items[i].ParentID) < parentKey(items[j].ParentID)
	})
	return items, nil
}

func (s *Service) CreateSection(ctx context.Context, authorID, parentID, title string) (domainrecommendation.Block, error) {
	if s.deps.Repository == nil {
		return domainrecommendation.Block{}, shared.ErrNotFound
	}
	title = strings.TrimSpace(title)
	if title == "" {
		return domainrecommendation.Block{}, fmt.Errorf("%w: section title is required", shared.ErrValidation)
	}

	parent, err := s.parentSection(ctx, parentID)
	if err != nil {
		return domainrecommendation.Block{}, err
	}

	items, err := s.List(ctx)
	if err != nil {
		return domainrecommendation.Block{}, err
	}
	parentPtr := parentIDPointer(parentID)
	sectionNumber := nextSectionNumber(items, parent, parentPtr)
	block := domainrecommendation.Block{
		ID:            s.deps.IDs.NewID(),
		ParentID:      parentPtr,
		SectionTitle:  &title,
		SectionNumber: &sectionNumber,
		AuthorID:      authorID,
		Status:        "active",
		SortOrder:     nextSortOrder(items, parentPtr),
	}
	if err := s.deps.Repository.Create(ctx, block); err != nil {
		return domainrecommendation.Block{}, err
	}
	return block, nil
}

func (s *Service) CreateBlock(ctx context.Context, authorID, sectionID, text string) (domainrecommendation.Block, error) {
	if s.deps.Repository == nil {
		return domainrecommendation.Block{}, shared.ErrNotFound
	}
	text = strings.TrimSpace(text)
	if text == "" {
		return domainrecommendation.Block{}, fmt.Errorf("%w: recommendation text is required", shared.ErrValidation)
	}

	section, err := s.deps.Repository.FindByID(ctx, sectionID)
	if err != nil {
		return domainrecommendation.Block{}, err
	}
	if !section.IsSection() {
		return domainrecommendation.Block{}, fmt.Errorf("%w: parent must be a section", shared.ErrValidation)
	}

	items, err := s.List(ctx)
	if err != nil {
		return domainrecommendation.Block{}, err
	}
	parentPtr := parentIDPointer(sectionID)
	block := domainrecommendation.Block{
		ID:        s.deps.IDs.NewID(),
		ParentID:  parentPtr,
		Text:      &text,
		AuthorID:  authorID,
		Status:    "active",
		SortOrder: nextSortOrder(items, parentPtr),
	}
	if err := s.deps.Repository.Create(ctx, block); err != nil {
		return domainrecommendation.Block{}, err
	}
	return block, nil
}

func (s *Service) UpdateSection(ctx context.Context, id, title string) (domainrecommendation.Block, error) {
	if s.deps.Repository == nil {
		return domainrecommendation.Block{}, shared.ErrNotFound
	}
	title = strings.TrimSpace(title)
	if title == "" {
		return domainrecommendation.Block{}, fmt.Errorf("%w: section title is required", shared.ErrValidation)
	}

	block, err := s.deps.Repository.FindByID(ctx, id)
	if err != nil {
		return domainrecommendation.Block{}, err
	}
	if !block.IsSection() {
		return domainrecommendation.Block{}, fmt.Errorf("%w: target is not a section", shared.ErrValidation)
	}
	block.SectionTitle = &title
	if err := s.deps.Repository.Update(ctx, block); err != nil {
		return domainrecommendation.Block{}, err
	}
	return block, nil
}

func (s *Service) UpdateBlock(ctx context.Context, id, text string) (domainrecommendation.Block, error) {
	if s.deps.Repository == nil {
		return domainrecommendation.Block{}, shared.ErrNotFound
	}
	text = strings.TrimSpace(text)
	if text == "" {
		return domainrecommendation.Block{}, fmt.Errorf("%w: recommendation text is required", shared.ErrValidation)
	}

	block, err := s.deps.Repository.FindByID(ctx, id)
	if err != nil {
		return domainrecommendation.Block{}, err
	}
	if block.IsSection() {
		return domainrecommendation.Block{}, fmt.Errorf("%w: target is not a recommendation block", shared.ErrValidation)
	}
	block.Text = &text
	if err := s.deps.Repository.Update(ctx, block); err != nil {
		return domainrecommendation.Block{}, err
	}
	return block, nil
}

func (s *Service) DeleteBlock(ctx context.Context, id string) error {
	if s.deps.Repository == nil {
		return shared.ErrNotFound
	}
	return s.deps.Repository.Delete(ctx, id)
}

func (s *Service) DeleteSection(ctx context.Context, id string) error {
	if s.deps.Repository == nil {
		return shared.ErrNotFound
	}
	target, err := s.deps.Repository.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if !target.IsSection() {
		return fmt.Errorf("%w: target is not a section", shared.ErrValidation)
	}

	items, err := s.List(ctx)
	if err != nil {
		return err
	}
	for _, childID := range descendantIDs(items, id) {
		if err := s.deps.Repository.Delete(ctx, childID); err != nil && !errors.Is(err, shared.ErrNotFound) {
			return err
		}
	}
	return s.deps.Repository.Delete(ctx, id)
}

func (s *Service) AssignToClient(ctx context.Context, specialistID, clientID, text string) (AssignmentView, error) {
	specialistID = strings.TrimSpace(specialistID)
	clientID = strings.TrimSpace(clientID)
	text = strings.TrimSpace(text)
	if specialistID == "" || clientID == "" || text == "" {
		return AssignmentView{}, fmt.Errorf("%w: specialist, client and recommendation are required", shared.ErrValidation)
	}
	if s.deps.Assignments == nil || s.deps.Collaborations == nil || s.deps.Users == nil {
		return AssignmentView{}, shared.ErrNotFound
	}

	specialist, err := s.deps.Users.FindByID(ctx, specialistID)
	if err != nil {
		return AssignmentView{}, err
	}
	if specialist.Role != shared.RoleSpecialist {
		return AssignmentView{}, shared.ErrForbidden
	}
	client, err := s.deps.Users.FindByID(ctx, clientID)
	if err != nil {
		return AssignmentView{}, err
	}
	if client.Role != shared.RoleClient || !client.Status.CanAuthenticate() {
		return AssignmentView{}, shared.ErrForbidden
	}

	collaboration, err := s.deps.Collaborations.FindBetween(ctx, specialist.ID, client.ID)
	if err != nil {
		return AssignmentView{}, err
	}
	if !collaboration.GrantsAccess() {
		return AssignmentView{}, shared.ErrForbidden
	}

	assignment := domainrecommendation.Assignment{
		ID:              s.newID(),
		CollaborationID: collaboration.ID,
		SpecialistID:    specialist.ID,
		ClientID:        client.ID,
		Text:            text,
		AssignedAt:      s.now(),
		Status:          assignmentStatusActive,
	}
	if assignment.ID == "" {
		return AssignmentView{}, fmt.Errorf("%w: id generator is required", shared.ErrValidation)
	}
	if err := s.deps.Assignments.Create(ctx, assignment); err != nil {
		return AssignmentView{}, err
	}
	return s.toAssignmentView(ctx, assignment)
}

func (s *Service) ListClientAssignments(ctx context.Context, clientID string) ([]AssignmentView, error) {
	clientID = strings.TrimSpace(clientID)
	if clientID == "" {
		return nil, fmt.Errorf("%w: client is required", shared.ErrValidation)
	}
	if s.deps.Assignments == nil {
		return []AssignmentView{}, nil
	}

	items, err := s.deps.Assignments.ListByClient(ctx, clientID)
	if errors.Is(err, shared.ErrNotFound) {
		return []AssignmentView{}, nil
	}
	if err != nil {
		return nil, err
	}

	sort.SliceStable(items, func(i, j int) bool {
		return items[i].AssignedAt.After(items[j].AssignedAt)
	})

	out := make([]AssignmentView, 0, len(items))
	for _, item := range items {
		if item.Status != "" && item.Status != assignmentStatusActive {
			continue
		}
		view, err := s.toAssignmentView(ctx, item)
		if err != nil {
			return nil, err
		}
		out = append(out, view)
	}
	return out, nil
}

func (s *Service) ListSpecialistAssignments(ctx context.Context, specialistID string) ([]AssignmentView, error) {
	specialistID = strings.TrimSpace(specialistID)
	if specialistID == "" {
		return nil, fmt.Errorf("%w: specialist is required", shared.ErrValidation)
	}
	if s.deps.Assignments == nil {
		return []AssignmentView{}, nil
	}

	items, err := s.deps.Assignments.ListBySpecialist(ctx, specialistID)
	if errors.Is(err, shared.ErrNotFound) {
		return []AssignmentView{}, nil
	}
	if err != nil {
		return nil, err
	}
	sort.SliceStable(items, func(i, j int) bool {
		return items[i].AssignedAt.After(items[j].AssignedAt)
	})

	out := make([]AssignmentView, 0, len(items))
	for _, item := range items {
		if item.Status != "" && item.Status != assignmentStatusActive {
			continue
		}
		view, err := s.toAssignmentView(ctx, item)
		if err != nil {
			return nil, err
		}
		out = append(out, view)
	}
	return out, nil
}

func (s *Service) DeleteAssignment(ctx context.Context, specialistID, assignmentID string) error {
	specialistID = strings.TrimSpace(specialistID)
	assignmentID = strings.TrimSpace(assignmentID)
	if specialistID == "" || assignmentID == "" {
		return fmt.Errorf("%w: specialist and assignment are required", shared.ErrValidation)
	}
	if s.deps.Assignments == nil {
		return shared.ErrNotFound
	}

	assignment, err := s.deps.Assignments.FindByID(ctx, assignmentID)
	if err != nil {
		return err
	}
	if assignment.SpecialistID != specialistID {
		return shared.ErrForbidden
	}
	assignment.Status = "deleted"
	return s.deps.Assignments.Update(ctx, assignment)
}

func (s *Service) parentSection(ctx context.Context, parentID string) (*domainrecommendation.Block, error) {
	if strings.TrimSpace(parentID) == "" || parentID == "root" {
		return nil, nil
	}

	parent, err := s.deps.Repository.FindByID(ctx, parentID)
	if err != nil {
		return nil, err
	}
	if !parent.IsSection() {
		return nil, fmt.Errorf("%w: parent must be a section", shared.ErrValidation)
	}
	return &parent, nil
}

func parentIDPointer(parentID string) *string {
	trimmed := strings.TrimSpace(parentID)
	if trimmed == "" || trimmed == "root" {
		return nil
	}
	return &trimmed
}

func nextSortOrder(items []domainrecommendation.Block, parentID *string) int {
	maxOrder := 0
	for _, item := range items {
		if sameParent(item.ParentID, parentID) && item.SortOrder > maxOrder {
			maxOrder = item.SortOrder
		}
	}
	return maxOrder + 1
}

func nextSectionNumber(items []domainrecommendation.Block, parent *domainrecommendation.Block, parentID *string) string {
	count := 0
	for _, item := range items {
		if item.IsSection() && sameParent(item.ParentID, parentID) {
			count++
		}
	}
	next := fmt.Sprintf("%d", count+1)
	if parent != nil && parent.SectionNumber != nil && strings.TrimSpace(*parent.SectionNumber) != "" {
		return strings.TrimSpace(*parent.SectionNumber) + "." + next
	}
	return next
}

func descendantIDs(items []domainrecommendation.Block, sectionID string) []string {
	var ids []string
	for _, item := range items {
		if item.ParentID != nil && *item.ParentID == sectionID {
			ids = append(ids, item.ID)
			if item.IsSection() {
				ids = append(ids, descendantIDs(items, item.ID)...)
			}
		}
	}
	return ids
}

func sameParent(left, right *string) bool {
	return parentKey(left) == parentKey(right)
}

func parentKey(parentID *string) string {
	if parentID == nil {
		return ""
	}
	return strings.TrimSpace(*parentID)
}

func (s *Service) toAssignmentView(ctx context.Context, assignment domainrecommendation.Assignment) (AssignmentView, error) {
	view := AssignmentView{Assignment: assignment}
	if s.deps.Users == nil || strings.TrimSpace(assignment.SpecialistID) == "" {
		return view, nil
	}

	specialist, err := s.deps.Users.FindByID(ctx, assignment.SpecialistID)
	if err != nil && !errors.Is(err, shared.ErrNotFound) {
		return AssignmentView{}, err
	}
	if err == nil {
		view.SpecialistName = userDisplayName(specialist)
		view.SpecialistEmail = specialist.Email
	}
	if strings.TrimSpace(assignment.ClientID) != "" {
		client, err := s.deps.Users.FindByID(ctx, assignment.ClientID)
		if err != nil && !errors.Is(err, shared.ErrNotFound) {
			return AssignmentView{}, err
		}
		if err == nil {
			view.ClientName = userDisplayName(client)
			view.ClientEmail = client.Email
		}
	}
	return view, nil
}

func (s *Service) now() time.Time {
	if s.deps.Clock == nil {
		return time.Now()
	}
	return s.deps.Clock.Now()
}

func (s *Service) newID() string {
	if s.deps.IDs == nil {
		return ""
	}
	return s.deps.IDs.NewID()
}

func userDisplayName(item user.User) string {
	return firstNonEmpty(
		strings.Join(nonEmpty(item.Surname, item.Name, item.Patronymic), " "),
		item.Email,
		item.ID,
	)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func nonEmpty(values ...string) []string {
	out := make([]string, 0, len(values))
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}
