package collaboration

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	domaincollaboration "github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/collaboration"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/user"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
)

const (
	directionIncoming = "incoming"
	directionOutgoing = "outgoing"
	directionAccepted = "accepted"
	directionFinished = "finished"
)

type repositoryByEmail interface {
	ListByClientEmail(ctx context.Context, email string) ([]domaincollaboration.ClientSpecialist, error)
}

type Deps struct {
	ClientCollaborations port.ClientCollaborationRepository
	Collaborations       port.CollaborationRepository
	Users                port.UserRepository
	IDs                  port.IDGenerator
	Clock                port.Clock
}

type Service struct {
	deps Deps
}

func NewService(deps Deps) *Service {
	return &Service{deps: deps}
}

func (s *Service) ListClientSpecialists(ctx context.Context, userID string) ([]domaincollaboration.ClientSpecialist, error) {
	if strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("%w: user is required", shared.ErrValidation)
	}
	items := make([]domaincollaboration.ClientSpecialist, 0)

	if s.deps.Collaborations != nil && s.deps.Users != nil {
		collaborations, err := s.deps.Collaborations.ListByClient(ctx, userID)
		if err != nil && !errorsIsNotFound(err) {
			return nil, err
		}
		for _, collaboration := range collaborations {
			if collaboration.Status != domaincollaboration.StatusAccepted && collaboration.Status != domaincollaboration.StatusFinished {
				continue
			}
			item, err := s.toClientSpecialist(ctx, collaboration)
			if err != nil {
				return nil, err
			}
			items = append(items, item)
		}
	}

	if s.deps.ClientCollaborations != nil {
		existingItems, err := s.deps.ClientCollaborations.ListByClient(ctx, userID)
		if err != nil && !errorsIsNotFound(err) {
			return nil, err
		}
		if err == nil {
			items = mergeClientSpecialists(items, existingItems)
		}
	}

	if byEmail, ok := s.deps.ClientCollaborations.(repositoryByEmail); ok && s.deps.Users != nil {
		currentUser, err := s.deps.Users.FindByID(ctx, userID)
		if err != nil && !errorsIsNotFound(err) {
			return nil, err
		}
		if strings.TrimSpace(currentUser.Email) != "" {
			emailItems, err := byEmail.ListByClientEmail(ctx, currentUser.Email)
			if err != nil && !errorsIsNotFound(err) {
				return nil, err
			}
			if err == nil {
				items = mergeClientSpecialists(items, emailItems)
			}
		}
	}

	sort.SliceStable(items, func(i, j int) bool {
		return items[i].StartedAt.After(items[j].StartedAt)
	})
	return items, nil
}

func (s *Service) CreateRequest(ctx context.Context, actorID, targetID string) (domaincollaboration.WorkRequest, error) {
	actorID = strings.TrimSpace(actorID)
	targetID = strings.TrimSpace(targetID)
	if actorID == "" || targetID == "" {
		return domaincollaboration.WorkRequest{}, fmt.Errorf("%w: user and target are required", shared.ErrValidation)
	}
	if actorID == targetID {
		return domaincollaboration.WorkRequest{}, fmt.Errorf("%w: target must be another user", shared.ErrValidation)
	}
	if s.deps.Collaborations == nil || s.deps.Users == nil {
		return domaincollaboration.WorkRequest{}, shared.ErrNotFound
	}

	actor, err := s.deps.Users.FindByID(ctx, actorID)
	if err != nil {
		return domaincollaboration.WorkRequest{}, err
	}
	target, err := s.deps.Users.FindByID(ctx, targetID)
	if err != nil {
		return domaincollaboration.WorkRequest{}, err
	}
	if !target.Status.CanAuthenticate() {
		return domaincollaboration.WorkRequest{}, fmt.Errorf("%w: target account is not active", shared.ErrForbidden)
	}

	var clientID string
	var specialistID string
	status := domaincollaboration.StatusPending
	switch {
	case actor.Role == shared.RoleClient && target.Role == shared.RoleSpecialist:
		clientID = actor.ID
		specialistID = target.ID
		status = domaincollaboration.StatusPendingClient
	case actor.Role == shared.RoleSpecialist && target.Role == shared.RoleClient:
		clientID = target.ID
		specialistID = actor.ID
		status = domaincollaboration.StatusPendingSpecialist
	default:
		return domaincollaboration.WorkRequest{}, fmt.Errorf("%w: collaboration requires client and specialist", shared.ErrValidation)
	}

	now := s.now()
	existing, err := s.deps.Collaborations.FindBetween(ctx, specialistID, clientID)
	if err == nil {
		if existing.GrantsAccess() || existing.Pending() {
			return domaincollaboration.WorkRequest{}, shared.ErrConflict
		}
		existing.Status = status
		existing.StartedAt = now
		if err := s.deps.Collaborations.Update(ctx, existing); err != nil {
			return domaincollaboration.WorkRequest{}, err
		}
		return s.toWorkRequest(ctx, actor, existing)
	}
	if !errorsIsNotFound(err) {
		return domaincollaboration.WorkRequest{}, err
	}

	collaboration := domaincollaboration.Collaboration{
		ID:           s.newID(),
		SpecialistID: specialistID,
		ClientID:     clientID,
		StartedAt:    now,
		Status:       status,
	}
	if collaboration.ID == "" {
		return domaincollaboration.WorkRequest{}, fmt.Errorf("%w: id generator is required", shared.ErrValidation)
	}
	if err := s.deps.Collaborations.Create(ctx, collaboration); err != nil {
		return domaincollaboration.WorkRequest{}, err
	}
	return s.toWorkRequest(ctx, actor, collaboration)
}

func (s *Service) ListWorkRequests(ctx context.Context, userID string) ([]domaincollaboration.WorkRequest, error) {
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return nil, fmt.Errorf("%w: user is required", shared.ErrValidation)
	}
	if s.deps.Collaborations == nil || s.deps.Users == nil {
		return []domaincollaboration.WorkRequest{}, nil
	}

	currentUser, err := s.deps.Users.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	var collaborations []domaincollaboration.Collaboration
	switch currentUser.Role {
	case shared.RoleClient:
		collaborations, err = s.deps.Collaborations.ListByClient(ctx, currentUser.ID)
	case shared.RoleSpecialist:
		collaborations, err = s.deps.Collaborations.ListBySpecialist(ctx, currentUser.ID)
	default:
		return nil, shared.ErrForbidden
	}
	if err != nil && !errorsIsNotFound(err) {
		return nil, err
	}

	requests := make([]domaincollaboration.WorkRequest, 0, len(collaborations))
	for _, collaboration := range collaborations {
		if !collaboration.Pending() && !collaboration.GrantsAccess() {
			continue
		}
		request, err := s.toWorkRequest(ctx, currentUser, collaboration)
		if err != nil {
			return nil, err
		}
		requests = append(requests, request)
	}
	sort.SliceStable(requests, func(i, j int) bool {
		return requests[i].StartedAt.After(requests[j].StartedAt)
	})
	return requests, nil
}

func (s *Service) RespondToRequest(ctx context.Context, userID, requestID, decision string) (domaincollaboration.WorkRequest, error) {
	userID = strings.TrimSpace(userID)
	requestID = strings.TrimSpace(requestID)
	decision = strings.TrimSpace(strings.ToLower(decision))
	if userID == "" || requestID == "" {
		return domaincollaboration.WorkRequest{}, fmt.Errorf("%w: user and request are required", shared.ErrValidation)
	}
	if decision != "accepted" && decision != "rejected" {
		return domaincollaboration.WorkRequest{}, fmt.Errorf("%w: unsupported decision", shared.ErrValidation)
	}
	if s.deps.Collaborations == nil || s.deps.Users == nil {
		return domaincollaboration.WorkRequest{}, shared.ErrNotFound
	}

	currentUser, err := s.deps.Users.FindByID(ctx, userID)
	if err != nil {
		return domaincollaboration.WorkRequest{}, err
	}
	collaboration, err := s.deps.Collaborations.FindByID(ctx, requestID)
	if err != nil {
		return domaincollaboration.WorkRequest{}, err
	}
	if !collaboration.Pending() {
		return domaincollaboration.WorkRequest{}, shared.ErrConflict
	}

	request, err := s.toWorkRequest(ctx, currentUser, collaboration)
	if err != nil {
		return domaincollaboration.WorkRequest{}, err
	}
	if !request.CanRespond {
		return domaincollaboration.WorkRequest{}, shared.ErrForbidden
	}

	if decision == "accepted" {
		collaboration.Status = domaincollaboration.StatusAccepted
	} else {
		collaboration.Status = domaincollaboration.StatusRejected
	}
	collaboration.StartedAt = s.now()
	if err := s.deps.Collaborations.Update(ctx, collaboration); err != nil {
		return domaincollaboration.WorkRequest{}, err
	}
	return s.toWorkRequest(ctx, currentUser, collaboration)
}

func (s *Service) FinishCollaboration(ctx context.Context, userID, collaborationID string) (domaincollaboration.WorkRequest, error) {
	userID = strings.TrimSpace(userID)
	collaborationID = strings.TrimSpace(collaborationID)
	if userID == "" || collaborationID == "" {
		return domaincollaboration.WorkRequest{}, fmt.Errorf("%w: user and collaboration are required", shared.ErrValidation)
	}
	if s.deps.Collaborations == nil || s.deps.Users == nil {
		return domaincollaboration.WorkRequest{}, shared.ErrNotFound
	}

	currentUser, err := s.deps.Users.FindByID(ctx, userID)
	if err != nil {
		return domaincollaboration.WorkRequest{}, err
	}
	collaboration, err := s.deps.Collaborations.FindByID(ctx, collaborationID)
	if err != nil {
		return domaincollaboration.WorkRequest{}, err
	}
	if !collaboration.GrantsAccess() {
		return domaincollaboration.WorkRequest{}, shared.ErrConflict
	}
	if currentUser.Role == shared.RoleClient && collaboration.ClientID != currentUser.ID {
		return domaincollaboration.WorkRequest{}, shared.ErrForbidden
	}
	if currentUser.Role == shared.RoleSpecialist && collaboration.SpecialistID != currentUser.ID {
		return domaincollaboration.WorkRequest{}, shared.ErrForbidden
	}
	if currentUser.Role != shared.RoleClient && currentUser.Role != shared.RoleSpecialist {
		return domaincollaboration.WorkRequest{}, shared.ErrForbidden
	}

	collaboration.Status = domaincollaboration.StatusFinished
	if err := s.deps.Collaborations.Update(ctx, collaboration); err != nil {
		return domaincollaboration.WorkRequest{}, err
	}
	return s.toWorkRequest(ctx, currentUser, collaboration)
}

func (s *Service) toWorkRequest(ctx context.Context, currentUser user.User, collaboration domaincollaboration.Collaboration) (domaincollaboration.WorkRequest, error) {
	var counterpartID string
	switch currentUser.Role {
	case shared.RoleClient:
		if collaboration.ClientID != currentUser.ID {
			return domaincollaboration.WorkRequest{}, shared.ErrForbidden
		}
		counterpartID = collaboration.SpecialistID
	case shared.RoleSpecialist:
		if collaboration.SpecialistID != currentUser.ID {
			return domaincollaboration.WorkRequest{}, shared.ErrForbidden
		}
		counterpartID = collaboration.ClientID
	default:
		return domaincollaboration.WorkRequest{}, shared.ErrForbidden
	}

	counterpart, err := s.deps.Users.FindByID(ctx, counterpartID)
	if err != nil {
		return domaincollaboration.WorkRequest{}, err
	}
	direction, canRespond := requestDirection(currentUser.Role, collaboration.Status)

	return domaincollaboration.WorkRequest{
		ID:                     collaboration.ID,
		SpecialistID:           collaboration.SpecialistID,
		ClientID:               collaboration.ClientID,
		CounterpartID:          counterpart.ID,
		CounterpartName:        displayName(counterpart),
		CounterpartEmail:       counterpart.Email,
		CounterpartRole:        string(counterpart.Role),
		CounterpartDescription: counterpart.About,
		StartedAt:              collaboration.StartedAt,
		Status:                 collaboration.Status,
		Direction:              direction,
		CanRespond:             canRespond,
	}, nil
}

func (s *Service) toClientSpecialist(ctx context.Context, collaboration domaincollaboration.Collaboration) (domaincollaboration.ClientSpecialist, error) {
	specialist, err := s.deps.Users.FindByID(ctx, collaboration.SpecialistID)
	if err != nil {
		return domaincollaboration.ClientSpecialist{}, err
	}
	return domaincollaboration.ClientSpecialist{
		ID:                    collaboration.ID,
		SpecialistID:          specialist.ID,
		SpecialistName:        displayName(specialist),
		SpecialistExperience:  strings.TrimSpace(specialist.Experience),
		SpecialistDescription: strings.TrimSpace(specialist.About),
		StartedAt:             collaboration.StartedAt,
		Status:                collaboration.Status,
	}, nil
}

func requestDirection(role shared.Role, status domaincollaboration.Status) (string, bool) {
	if status == domaincollaboration.StatusAccepted {
		return directionAccepted, false
	}
	if status == domaincollaboration.StatusFinished {
		return directionFinished, false
	}

	initiatedByClient := status == domaincollaboration.StatusPending || status == domaincollaboration.StatusPendingClient
	if role == shared.RoleClient {
		if initiatedByClient {
			return directionOutgoing, false
		}
		return directionIncoming, true
	}
	if role == shared.RoleSpecialist {
		if initiatedByClient {
			return directionIncoming, true
		}
		return directionOutgoing, false
	}
	return directionOutgoing, false
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

func mergeClientSpecialists(left, right []domaincollaboration.ClientSpecialist) []domaincollaboration.ClientSpecialist {
	out := make([]domaincollaboration.ClientSpecialist, 0, len(left)+len(right))
	seen := make(map[string]struct{}, len(left)+len(right))
	for _, item := range append(left, right...) {
		key := item.ID
		if key == "" {
			key = item.SpecialistID
		}
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, item)
	}
	return out
}

func displayName(item user.User) string {
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
	result := make([]string, 0, len(values))
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func errorsIsNotFound(err error) bool {
	return errors.Is(err, shared.ErrNotFound)
}
