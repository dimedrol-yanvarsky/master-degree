// Пакет specialist содержит сценарии каталога специалистов.
package specialist

import (
	"context"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/application/port"
	domainspecialist "github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/specialist"
)

// Service публикует сценарии каталога специалистов.
type Service struct {
	repository port.SpecialistRepository
}

// NewService собирает сервис каталога специалистов.
func NewService(repository port.SpecialistRepository) *Service {
	return &Service{repository: repository}
}

// List возвращает публичные профили специалистов.
func (s *Service) List(ctx context.Context) ([]domainspecialist.Profile, error) {
	return s.repository.List(ctx)
}
