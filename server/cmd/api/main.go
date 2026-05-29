package main

import (
	"context"
	"log"
	"time"

	taskusecase "github.com/dimedrol-yanvarsky/master-degree/server/internal/application/task"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/config"
	"github.com/dimedrol-yanvarsky/master-degree/server/internal/infrastructure/mongodb"
	taskmongo "github.com/dimedrol-yanvarsky/master-degree/server/internal/infrastructure/persistence/mongo"
	apphttp "github.com/dimedrol-yanvarsky/master-degree/server/internal/interfaces/http"
)

func main() {
	cfg := config.Load()

	connection, err := mongodb.Connect(context.Background(), mongodb.Config{
		URI:          cfg.MongoURI,
		DatabaseName: cfg.MongoDatabase,
	})
	if err != nil {
		log.Fatalf("failed to connect to MongoDB: %v", err)
	}
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := connection.Disconnect(ctx); err != nil {
			log.Printf("failed to disconnect from MongoDB: %v", err)
		}
	}()

	taskRepository := taskmongo.NewTaskRepository(connection.Database)
	createTaskUseCase := taskusecase.NewCreateTaskUseCase(taskRepository, mongodb.ObjectIDGenerator{})
	router := apphttp.NewRouter(apphttp.Dependencies{
		CreateTaskUseCase: createTaskUseCase,
	})

	log.Printf("server is running on %s", cfg.HTTPAddress)
	if err := router.Run(cfg.HTTPAddress); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}
