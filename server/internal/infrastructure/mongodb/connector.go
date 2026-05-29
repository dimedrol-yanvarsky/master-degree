package mongodb

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

const defaultConnectTimeout = 10 * time.Second

type Config struct {
	URI            string
	DatabaseName   string
	ConnectTimeout time.Duration
}

type Connection struct {
	Client   *mongo.Client
	Database *mongo.Database
}

func Connect(ctx context.Context, config Config) (*Connection, error) {
	timeout := config.ConnectTimeout
	if timeout == 0 {
		timeout = defaultConnectTimeout
	}

	connectCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	client, err := mongo.Connect(options.Client().ApplyURI(config.URI))
	if err != nil {
		return nil, err
	}

	if err := client.Ping(connectCtx, nil); err != nil {
		_ = client.Disconnect(context.Background())
		return nil, err
	}

	return &Connection{
		Client:   client,
		Database: client.Database(config.DatabaseName),
	}, nil
}

func (c *Connection) Disconnect(ctx context.Context) error {
	if c == nil || c.Client == nil {
		return nil
	}

	return c.Client.Disconnect(ctx)
}
