# syntax=docker/dockerfile:1

############################
# Stage 1: builder
# Instala TODAS las dependencias, genera Prisma Client y compila TypeScript.
############################
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Dependencias primero para aprovechar la cache de capas.
COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma

RUN npm ci

# Código fuente y configuración de compilación.
COPY tsconfig.json ./
COPY src ./src

# prisma.config.ts evalúa env("DATABASE_URL") al CARGAR la config, incluso para
# `prisma generate` (que no abre conexión). Le damos un placeholder solo en build.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

# build = "prisma generate && tsc" -> genera client en node_modules/.prisma
# y compila a dist/ (dist/src/app.js por rootDir ./).
RUN npm run build


############################
# Stage 2: runtime
# Imagen final. Mantiene node_modules COMPLETO a propósito:
#   - el servicio `migrate` necesita el CLI de Prisma (devDependency)
#   - el servicio `api-test` ejecuta `npm test` (jest/ts-jest, devDependencies)
# Por eso copiamos node_modules desde builder en lugar de hacer un
# `npm ci --omit=dev`, que dejaría la imagen sin esas herramientas.
############################
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# node_modules ya tiene el Prisma Client generado (node_modules/.prisma)
# y el CLI de Prisma + jest desde el builder.
COPY --from=builder /app/node_modules ./node_modules

# Artefactos compilados y metadatos necesarios en ejecución.
COPY --from=builder /app/dist ./dist
COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma

# Para correr la suite de tests dentro de la misma imagen.
COPY tsconfig.json ./
COPY jest.config.js ./
COPY --from=builder /app/src ./src

# Directorio de subidas (se monta como volumen en compose).
RUN mkdir -p /app/uploads

EXPOSE 3000

# start = "node dist/src/app.js"
CMD ["npm", "start"]
