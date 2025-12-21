FROM rust:1.92 as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/target/release/pdf-worker /usr/local/bin/pdf-worker
CMD ["pdf-worker"]


