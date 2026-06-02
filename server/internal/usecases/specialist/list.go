// Пакет specialist содержит сценарии каталога специалистов.
package specialist

import (
	"context"

	domainspecialist "github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/specialist"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
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
