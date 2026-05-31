package memory

import (
	"context"
	"sync"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/application/port"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/emotion"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/domain/shared"
)

var _ port.EmotionGraphRepository = (*EmotionGraphRepository)(nil)

// EmotionGraphRepository — хранилище графов эмоционального состояния в памяти.
type EmotionGraphRepository struct {
	mu      sync.RWMutex
	byUser  map[string]emotion.Graph
}

// NewEmotionGraphRepository создаёт пустое хранилище графов.
func NewEmotionGraphRepository() *EmotionGraphRepository {
	return &EmotionGraphRepository{byUser: make(map[string]emotion.Graph)}
}

func (r *EmotionGraphRepository) FindByUser(_ context.Context, userID string) (emotion.Graph, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	graph, ok := r.byUser[userID]
	if !ok {
		return emotion.Graph{}, shared.ErrNotFound
	}
	return graph, nil
}

func (r *EmotionGraphRepository) AppendPoint(_ context.Context, userID string, point emotion.Point) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	graph, ok := r.byUser[userID]
	if !ok {
		graph = emotion.Graph{ID: "graph:" + userID, UserID: userID}
	}
	graph.Points = append(graph.Points, point)
	r.byUser[userID] = graph
	return nil
}
