# Dockerfile para el repo esiad-frontend (Angular v21).
# Copiar a la RAÍZ de esiad-frontend/ como `Dockerfile`.
# Ajustar <proyecto> en la ruta de salida (ver angular.json -> outputPath).

############################
# Stage 1: build de Angular
############################
FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build de producción. Con reverse proxy, environment.prod.ts usa '/api'
# (rutas relativas) -> NO se inyecta URL de API.
RUN npm run build -- --configuration production

############################
# Stage 2: nginx sirve el estático
############################
FROM nginx:1.27-alpine AS runtime

# En Angular moderno el index queda en dist/<proyecto>/browser.
# CAMBIA "esiad-frontend" por el nombre real del proyecto en angular.json.
COPY --from=builder /app/dist/esiad-frontend/browser /usr/share/nginx/html

EXPOSE 80
# default.conf llega montado por deploy/docker-compose.yml (deploy/nginx.conf).
CMD ["nginx", "-g", "daemon off;"]
