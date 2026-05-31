package mongodb

import (
	"go.mongodb.org/mongo-driver/v2/bson"

	"github.com/dimedrol-yanvarsky/master-degree/server/internal/application/port"
)

// Проверка на этапе компиляции: адаптер удовлетворяет порту приложения.
var _ port.IDGenerator = ObjectIDGenerator{}

type ObjectIDGenerator struct{}

func (ObjectIDGenerator) NewID() string {
	return bson.NewObjectID().Hex()
}
