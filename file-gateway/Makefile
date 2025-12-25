APP_NAME=file-gateway

.PHONY: dev run build release clean fmt clippy test setup

setup:
	cargo install cargo-watch

dev:
	cargo watch -x run

run:
	cargo run

build:
	cargo build

release:
	cargo build --release

fmt:
	cargo fmt

clippy:
	cargo clippy -- -D warnings

test:
	cargo test

clean:
	cargo clean

redis:
	docker run -d --name certgra_redis -p 6379:6379 --restart unless-stopped redis:7-alpine redis-server --requirepass "supersecret" || true

nats:
	docker run -d --name certgra_nats -p 4222:4222 --restart unless-stopped nats:2.10-alpine || true

stop:
	docker stop certgra_redis certgra_nats || true

rm:
	docker rm -f certgra_redis certgra_nats || true
