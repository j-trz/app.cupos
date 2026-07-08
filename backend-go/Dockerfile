# Imagen para correr el backend como servidor tradicional (Azure App Service /
# Container Apps, un VPS, Railway, Render, etc.) usando cmd/api/main.go — NO
# uses esta imagen para Vercel, que despliega api/index.go como función
# serverless directamente vía vercel.json + @vercel/go.
#
# Ajustá la versión de Go si go.mod cambia (hoy: go 1.25.0).
FROM golang:1.25-alpine AS builder
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/api

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/server .
COPY --from=builder /app/migrations ./migrations

EXPOSE 8080
ENV PORT=8080
CMD ["./server"]
