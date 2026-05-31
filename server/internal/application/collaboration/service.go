package collaboration

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/application/port"
	domaincollaboration "github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/collaboration"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
)

type repositoryByEmail interface {
	ListByClientEmail(ctx context.Context, email string) ([]domaincollaboration.ClientSpecialist, error)
}

type Deps struct {
	Collaborations port.ClientCollaborationRepository
	Users          port.UserRepository
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
	if s.deps.Collaborations == nil {
		return []domaincollaboration.ClientSpecialist{}, nil
	}

	items, err := s.deps.Collaborations.ListByClient(ctx, userID)
	if err != nil && !errorsIsNotFound(err) {
		return nil, err
	}
	if err != nil {
		items = nil
	}

	if byEmail, ok := s.deps.Collaborations.(repositoryByEmail); ok && s.deps.Users != nil {
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

func errorsIsNotFound(err error) bool {
	return errors.Is(err, shared.ErrNotFound)
}
