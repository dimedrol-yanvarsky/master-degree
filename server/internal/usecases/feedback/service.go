package feedback

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	domainfeedback "github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/feedback"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/shared"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
)

const (
	StatusActive  = "active"
	StatusPending = "pending"
	StatusHidden  = "hidden"
	StatusDeleted = "deleted"
)

type Deps struct {
	Feedback port.FeedbackRepository
	Users    port.UserRepository
	IDs      port.IDGenerator
	Clock    port.Clock
}

type ReviewView struct {
	domainfeedback.Feedback
	AuthorName  string
	AuthorEmail string
}

type Service struct {
	deps Deps
}

func NewService(deps Deps) *Service {
	return &Service{deps: deps}
}

func (s *Service) List(ctx context.Context) ([]ReviewView, error) {
	items, err := s.listViews(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]ReviewView, 0, len(items))
	for _, item := range items {
		status := strings.TrimSpace(item.Status)
		if status == "" || status == StatusActive {
			out = append(out, item)
		}
	}
	return out, nil
}

func (s *Service) ListModeration(ctx context.Context) ([]ReviewView, error) {
	return s.listViews(ctx)
}

func (s *Service) ListOwn(ctx context.Context, userID string) ([]ReviewView, error) {
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return nil, fmt.Errorf("%w: user is required", shared.ErrValidation)
	}
	items, err := s.listViews(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]ReviewView, 0, len(items))
	for _, item := range items {
		if item.UserID == userID {
			out = append(out, item)
		}
	}
	return out, nil
}

func (s *Service) Create(ctx context.Context, userID, body string) (ReviewView, error) {
	if s.deps.Feedback == nil {
		return ReviewView{}, shared.ErrNotFound
	}

	userID = strings.TrimSpace(userID)
	body = strings.TrimSpace(body)
	if userID == "" || body == "" {
		return ReviewView{}, fmt.Errorf("%w: user and review text are required", shared.ErrValidation)
	}
	if len([]rune(body)) > 1200 {
		return ReviewView{}, fmt.Errorf("%w: review text is too long", shared.ErrValidation)
	}

	item := domainfeedback.Feedback{
		ID:        s.newID(),
		UserID:    userID,
		Body:      body,
		CreatedAt: s.now(),
		Status:    StatusPending,
	}
	if item.ID == "" {
		return ReviewView{}, fmt.Errorf("%w: id generator is required", shared.ErrValidation)
	}
	if err := s.deps.Feedback.Create(ctx, item); err != nil {
		return ReviewView{}, err
	}
	return s.toReviewView(ctx, item)
}

func (s *Service) UpdateOwn(ctx context.Context, userID, id, body string) (ReviewView, error) {
	if s.deps.Feedback == nil {
		return ReviewView{}, shared.ErrNotFound
	}

	userID = strings.TrimSpace(userID)
	id = strings.TrimSpace(id)
	body = strings.TrimSpace(body)
	if userID == "" || id == "" || body == "" {
		return ReviewView{}, fmt.Errorf("%w: user, review and text are required", shared.ErrValidation)
	}
	if len([]rune(body)) > 1200 {
		return ReviewView{}, fmt.Errorf("%w: review text is too long", shared.ErrValidation)
	}

	item, err := s.deps.Feedback.FindByID(ctx, id)
	if err != nil {
		return ReviewView{}, err
	}
	if item.UserID != userID {
		return ReviewView{}, shared.ErrForbidden
	}
	item.Body = body
	item.Status = StatusPending
	if err := s.deps.Feedback.Update(ctx, item); err != nil {
		return ReviewView{}, err
	}
	return s.toReviewView(ctx, item)
}

func (s *Service) DeleteOwn(ctx context.Context, userID, id string) error {
	if s.deps.Feedback == nil {
		return shared.ErrNotFound
	}
	userID = strings.TrimSpace(userID)
	id = strings.TrimSpace(id)
	if userID == "" || id == "" {
		return fmt.Errorf("%w: user and review are required", shared.ErrValidation)
	}
	item, err := s.deps.Feedback.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if item.UserID != userID {
		return shared.ErrForbidden
	}
	return s.deps.Feedback.Delete(ctx, id)
}

func (s *Service) SetStatus(ctx context.Context, id, status string) error {
	if s.deps.Feedback == nil {
		return shared.ErrNotFound
	}

	status = strings.TrimSpace(status)
	if status != StatusActive && status != StatusPending && status != StatusHidden {
		return fmt.Errorf("%w: unsupported feedback status", shared.ErrValidation)
	}

	item, err := s.deps.Feedback.FindByID(ctx, id)
	if err != nil {
		return err
	}
	item.Status = status
	return s.deps.Feedback.Update(ctx, item)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	if s.deps.Feedback == nil {
		return shared.ErrNotFound
	}
	return s.deps.Feedback.Delete(ctx, id)
}

func (s *Service) listViews(ctx context.Context) ([]ReviewView, error) {
	if s.deps.Feedback == nil {
		return []ReviewView{}, nil
	}
	items, err := s.deps.Feedback.List(ctx)
	if errors.Is(err, shared.ErrNotFound) {
		return []ReviewView{}, nil
	}
	if err != nil {
		return nil, err
	}

	out := make([]ReviewView, 0, len(items))
	for _, item := range items {
		view, err := s.toReviewView(ctx, item)
		if err != nil {
			return nil, err
		}
		out = append(out, view)
	}
	return out, nil
}

func (s *Service) toReviewView(ctx context.Context, item domainfeedback.Feedback) (ReviewView, error) {
	view := ReviewView{Feedback: item}
	if s.deps.Users != nil && strings.TrimSpace(item.UserID) != "" {
		author, err := s.deps.Users.FindByID(ctx, item.UserID)
		if err != nil && !errors.Is(err, shared.ErrNotFound) {
			return ReviewView{}, err
		}
		if err == nil {
			view.AuthorName = fullName(author.Surname, author.Name, author.Patronymic)
			view.AuthorEmail = author.Email
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

func fullName(parts ...string) string {
	cleaned := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			cleaned = append(cleaned, trimmed)
		}
	}
	return strings.Join(cleaned, " ")
}
