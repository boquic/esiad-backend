# Docker — esiad-backend

Stack containerizado: imagen multi-stage del backend + PostgreSQL, con migraciones
automáticas y una suite de integración aislada. El backend **no** depende del
PostgreSQL local del host.

## Archivos

- `Dockerfile` — build multi-stage (`builder` compila Prisma + TS, `runtime` ejecuta).
- `docker-compose.yml` — `postgres` + `migrate` + `api`.
- `docker-compose.test.yml` — `postgres-test` (efímero) + `api-test`.
- `.env.docker.example` / `.env.test.example` — plantillas (copiar a `.env.docker` / `.env.test`).

## Preparación

```bash
cp .env.docker.example .env.docker   # ajusta JWT_SECRET, credenciales, Twilio
cp .env.test.example   .env.test
```

`.env.docker` y `.env.test` están ignorados por git y por Docker (`.dockerignore`),
así que nunca llegan a la imagen ni al repo.

## Comandos mínimos

```bash
# Levantar el stack (build + postgres + migraciones + api)
docker compose up --build

# Aplicar migraciones de forma puntual
docker compose run --rm migrate

# Suite de integración contra una DB de test efímera
docker compose -f docker-compose.test.yml up --build \
  --abort-on-container-exit --exit-code-from api-test

# Limpiar (incluye volúmenes de datos)
docker compose down -v
docker compose -f docker-compose.test.yml down -v
```

Con el stack arriba, `GET http://localhost:3000/health` devuelve `200`.

## Notas de diseño

- La imagen final mantiene `node_modules` completo a propósito: el servicio
  `migrate` usa el CLI de Prisma y `api-test` ejecuta `jest`/`ts-jest`, todas
  devDependencies. Por eso no se hace `npm ci --omit=dev`.
- El Prisma Client se genera en el stage `builder` (`prisma generate`) y se
  transporta dentro de `node_modules/.prisma`.
- `migrate` corre `prisma migrate deploy` y debe terminar en exit `0` antes de
  que arranque `api` (`depends_on: service_completed_successfully`).
- `postgres-test` usa `tmpfs`, así que los datos de test no se persisten.
