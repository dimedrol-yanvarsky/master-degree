package memory

import (
	"context"
	"sync"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/entities/test"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/usecases/port"
)

var _ port.TestResultRepository = (*TestResultRepository)(nil)

// TestResultRepository — хранилище результатов прохождения тестов в памяти.
type TestResultRepository struct {
	mu     sync.RWMutex
	byUser map[string][]test.TestResult
}

// NewTestResultRepository создаёт пустое хранилище результатов.
func NewTestResultRepository() *TestResultRepository {
	return &TestResultRepository{byUser: make(map[string][]test.TestResult)}
}

func (r *TestResultRepository) Create(_ context.Context, result test.TestResult) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.byUser[result.UserID] = append(r.byUser[result.UserID], result)
	return nil
}

func (r *TestResultRepository) ListByUser(_ context.Context, userID string) ([]test.TestResult, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	stored := r.byUser[userID]
	out := make([]test.TestResult, len(stored))
	copy(out, stored)
	return out, nil
}
