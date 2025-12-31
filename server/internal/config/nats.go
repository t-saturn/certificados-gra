package config

import (
	"fmt"
	"time"

	"github.com/nats-io/nats.go"
)

type NATSClient struct {
	*nats.Conn
	js nats.JetStreamContext
}

func NewNATSClient(cfg NATSConfig) (*NATSClient, error) {
	opts := []nats.Option{
		nats.Name(cfg.Name),
		nats.Timeout(10 * time.Second),
		nats.ReconnectWait(2 * time.Second),
		nats.MaxReconnects(10),
		nats.DisconnectErrHandler(func(nc *nats.Conn, err error) {
			if err != nil {
				fmt.Printf("NATS disconnected: %v\n", err)
			}
		}),
		nats.ReconnectHandler(func(nc *nats.Conn) {
			fmt.Printf("NATS reconnected to %s\n", nc.ConnectedUrl())
		}),
		nats.ErrorHandler(func(nc *nats.Conn, sub *nats.Subscription, err error) {
			fmt.Printf("NATS error: %v\n", err)
		}),
	}

	conn, err := nats.Connect(cfg.URL, opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to NATS: %w", err)
	}

	// Try to create JetStream context (optional)
	js, _ := conn.JetStream()

	return &NATSClient{
		Conn: conn,
		js:   js,
	}, nil
}

// JetStream returns the JetStream context if available
func (n *NATSClient) JetStream() nats.JetStreamContext {
	return n.js
}

// Close closes the NATS connection
func (n *NATSClient) Close() {
	n.Conn.Close()
}
