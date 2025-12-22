package config

import (
	"context"
	"fmt"
	"time"

	"server/pkgs/logger"

	"github.com/redis/go-redis/v9"
)

var redisClient *redis.Client

func ConnectRedis() {
	cfg := GetConfig()

	redisClient = redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", cfg.REDISHost, cfg.REDISPort),
		Password: cfg.REDISPassword,
		DB:       cfg.REDISDB,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	pong, err := redisClient.Ping(ctx).Result()
	if err != nil {
		logger.Log.Fatal().Msgf("redis connection failed: %v", err)
	}

	logger.Log.Info().Msgf("redis connected successfully: %s db=%d addr=%s:%s", pong, cfg.REDISDB, cfg.REDISHost, cfg.REDISPort)
}

func GetRedis() *redis.Client {
	return redisClient
}

func CloseRedis() {
	if redisClient == nil {
		return
	}
	_ = redisClient.Close()
}
