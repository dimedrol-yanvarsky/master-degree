package mongodb

import "go.mongodb.org/mongo-driver/v2/bson"

type ObjectIDGenerator struct{}

func (ObjectIDGenerator) NewID() string {
	return bson.NewObjectID().Hex()
}
