# ============================================================
# Stage 1 – Build React frontend
# ============================================================
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --prefer-offline

COPY frontend/ ./
RUN npm run build

# ============================================================
# Stage 2 – Build Go backend
# ============================================================
FROM golang:1.25-alpine AS backend-builder

RUN apk add --no-cache git

WORKDIR /app/backend

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -trimpath -ldflags="-s -w" -o /app/bin/small-llm .

# ============================================================
# Stage 3 – Final image
# ============================================================
FROM alpine:3.21

RUN apk add --no-cache ca-certificates tzdata curl

# Non-root user
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

# Backend binary
COPY --from=backend-builder /app/bin/small-llm ./small-llm

# Frontend static files served from /app/public
# The Go binary serves /public/* as the SPA root (added via embed below)
COPY --from=frontend-builder /app/frontend/dist ./public

RUN chown -R app:app /app
USER app

# Port exposed by the Go backend
EXPOSE 8080

# The model and llama-server binary are downloaded to /home/app/.small-llm at
# first container start (same as the local dev flow).
ENV HOME=/home/app

ENTRYPOINT ["/app/small-llm"]
