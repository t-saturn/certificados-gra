# Etapa 1: dependencias (Bun)
FROM oven/bun:1-alpine AS deps
WORKDIR /app

COPY app/package.json ./
COPY app/bun.lock ./bun.lock

RUN bun install --ci

# Etapa 2: build (Bun)
FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/bun.lock ./bun.lock
COPY --from=deps /app/package.json ./package.json

COPY app/. .

# ---------- SOLO Build-time ENV ----------
# Vienen desde docker-compose como build.args
ARG APP_NEXT_PUBLIC_APP_CLIENT_ID

# Next necesita que se llame EXACTAMENTE así para exponerla al cliente
ENV NEXT_PUBLIC_APP_CLIENT_ID=${APP_NEXT_PUBLIC_APP_CLIENT_ID}

# Si tienes más NEXT_PUBLIC_*, las agregas igual:
# ARG APP_NEXT_PUBLIC_OTRA
# ENV NEXT_PUBLIC_OTRA=${APP_NEXT_PUBLIC_OTRA}

RUN bun run build

# Etapa 3: runtime (Bun)
FROM oven/bun:1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=30002

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/bun.lock ./bun.lock

EXPOSE 30002

CMD ["bun", "run", "start"]
