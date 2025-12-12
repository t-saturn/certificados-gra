# ---------- Stage 1: Build ----------
FROM golang:1.25-alpine AS builder

# Instala dependencias básicas (opcional pero útil)
RUN apk add --no-cache git ca-certificates

# Directorio de trabajo dentro del contenedor para el módulo Go
WORKDIR /app

# Copiamos solo los archivos de dependencias primero para aprovechar la cache
COPY server/go.mod server/go.sum* ./
RUN go mod download

# Ahora copiamos el resto del código
COPY server/. .

# Construimos el binario
# Ajusta el nombre "server" si quieres otro nombre de binario
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/server ./cmd/server

# ---------- Stage 2: Runtime ----------
FROM alpine:3.20

# Certificados para HTTPS si tu app los usa
RUN apk add --no-cache ca-certificates

# Directorio de trabajo para la app
WORKDIR /app

# Copiamos el binario desde el stage de build
COPY --from=builder /app/bin/server /usr/local/bin/server

# (Opcional) Crea directorios para logs, tmp, etc.
# Si prefieres usar volúmenes, puedes omitir esto o ajustarlo
RUN mkdir -p /app/logs /app/tmp

# Expón el puerto en el que escucha tu servidor
# Cambia "8080" si tu app usa otro
EXPOSE 8080

# Comando por defecto
ENTRYPOINT ["server"]
