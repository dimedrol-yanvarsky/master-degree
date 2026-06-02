package mongodb

import (
	"context"
	"errors"

	"go.mongodb.org/mongo-driver/v2/mongo"
)

// ErrNotConnected возвращается, когда у адаптера нет активного подключения к БД.
var ErrNotConnected = errors.New("mongodb: not connected")

// Adapter — шлюз к базе MongoDB, не привязанный к коллекциям. Единственная точка
// инфраструктуры, через которую конкретные репозитории получат свои коллекции.
// Имена коллекций здесь не заданы — репозиторий выбирает коллекцию после
// фиксации модели данных.
type Adapter struct {
	db *mongo.Database
}

// NewAdapter оборачивает подключение к БД. Подключение может быть nil — тогда
// адаптер «не подключён» (удобно, пока хранилище ещё не подключено).
func NewAdapter(db *mongo.Database) *Adapter {
	return &Adapter{db: db}
}

// Connected сообщает, держит ли адаптер активное подключение к БД.
func (a *Adapter) Connected() bool {
	return a != nil && a.db != nil
}

// Collection возвращает указанную коллекцию. Вызывающий (будущий репозиторий)
// сам решает, с какой коллекцией он работает.
func (a *Adapter) Collection(name string) (*mongo.Collection, error) {
	if !a.Connected() {
		return nil, ErrNotConnected
	}
	return a.db.Collection(name), nil
}

// Healthy пингует базу для проверки связи.
func (a *Adapter) Healthy(ctx context.Context) error {
	if !a.Connected() {
		return ErrNotConnected
	}
	return a.db.Client().Ping(ctx, nil)
}
