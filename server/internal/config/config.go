package config

import "os"

const (
	defaultHTTPAddress   = ":8080"
	defaultMongoURI      = "mongodb://localhost:27017"
	defaultMongoDatabase = "app"
)

type Config struct {
	HTTPAddress   string
	MongoURI      string
	MongoDatabase string
}

func Load() Config {
	return Config{
		HTTPAddress:   getEnv("HTTP_ADDRESS", defaultHTTPAddress),
		MongoURI:      getEnv("MONGO_URI", defaultMongoURI),
		MongoDatabase: getEnv("MONGO_DATABASE", defaultMongoDatabase),
	}
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	return value
}
