# Informe de Estado — esiad-backend

**Fecha:** 2026-06-30
**Alcance:** análisis del estado real del proyecto tras completar la fase de containerización (Docker). No se implementaron cambios como parte de este informe.

---

## 1. Resumen ejecutivo

**¿Listo para despliegue?** Parcialmente. El backend está **listo para un despliegue controlado (staging / entorno interno)** pero **no para producción pública** sin trabajo adicional de seguridad y pruebas.

Lo que ya funciona de forma verificada: la imagen Docker se construye sin errores, las migraciones de Prisma se aplican automáticamente (`prisma migrate deploy`, exit 0), la API arranca y conecta a PostgreSQL, el endpoint `/health` responde, y la suite de pruebas (21/21) pasa contra una base de datos efímera aislada. El stack es autocontenido y reproducible: no depende del PostgreSQL local del host.

Lo que bloquea producción: CORS está completamente abierto, no existe limitación de tasa (rate limiting) ni protección contra fuerza bruta, no hay 2FA, la cobertura de pruebas es baja (un solo módulo con pruebas de integración), y no existen pruebas de rendimiento, estrés ni concurrencia. Estos puntos se detallan en las secciones 8–12.

---

## 2. Cambios realizados

El trabajo de esta fase consistió en containerizar el backend de extremo a extremo:

- Creación de un `Dockerfile` multi-stage (`builder` + `runtime`) basado en `node:22-bookworm-slim`.
- Creación de `docker-compose.yml` con tres servicios orquestados (`postgres`, `migrate`, `api`) con healthchecks y dependencias condicionales.
- Creación de `docker-compose.test.yml` para ejecutar la suite de integración contra una base de datos efímera (`postgres-test` sobre `tmpfs`).
- Plantillas de entorno sin secretos (`.env.docker.example`, `.env.test.example`).
- Documentación operativa (`DOCKER.md`).

Tres correcciones surgieron durante la validación real y quedaron incorporadas:

1. **Placeholder de `DATABASE_URL` en el stage `builder`.** `prisma.config.ts` evalúa `env("DATABASE_URL")` al cargar la configuración, incluso para `prisma generate`, que no abre conexión. Se inyecta una URL ficticia solo en build (no se filtra a la imagen final).
2. **`PGDATA` en subdirectorio** (`/var/lib/postgresql/data/pgdata`). Evita el error `initdb: directory exists but is not empty` causado por restos del punto de montaje del volumen.
3. **La imagen conserva `node_modules` completo a propósito** (no se usa `npm ci --omit=dev`), porque el servicio `migrate` necesita el CLI de Prisma y el servicio de test necesita `jest`/`ts-jest`, ambos devDependencies.

---

## 3. Archivos creados

| Archivo | Propósito |
|---|---|
| `Dockerfile` | Build multi-stage; compila Prisma + TypeScript y ejecuta la API. |
| `docker-compose.yml` | Orquestación de `postgres` + `migrate` + `api`. |
| `docker-compose.test.yml` | Stack de pruebas de integración con DB efímera. |
| `.env.docker.example` | Plantilla de entorno para el stack normal (sin secretos). |
| `.env.test.example` | Plantilla de entorno para el stack de pruebas. |
| `.dockerignore` | Excluye `.env*`, `uploads`, `node_modules`, `.git`, `dist`, etc. del contexto de build. |
| `DOCKER.md` | Documentación de comandos y notas de diseño. |
| `INFORME_ESTADO.md` | Este informe. |

> Nota: `.dockerignore` figura en el control de versiones como archivo nuevo (untracked) junto con los archivos Docker. Aún no se ha hecho commit de ninguno de estos.

---

## 4. Archivos modificados

Cambios previos a esta fase que están presentes en el árbol de trabajo (sin commit):

| Archivo | Naturaleza del cambio |
|---|---|
| `package.json` | Scripts `build`, `start`, `db:migrate:deploy`, `db:migrate:dev`, `db:generate`. |
| `prisma.config.ts` | Configuración de Prisma 7 (schema, datasource, seed). |
| `.env.example` | Documentación de variables y notas para Docker Compose. |
| `.gitignore` | Ignora `.env*`, `uploads`, artefactos de Prisma. |
| `src/config/env.ts` | Validación de variables requeridas (`DATABASE_URL`, `JWT_SECRET`). |
| `src/config/database.ts` | Cliente Prisma con adaptador `pg` y verificación de conexión. |
| `src/middlewares/logging.middleware.ts` | Logging de peticiones (omite `/health`). |
| `src/docs/openapi.ts` | Especificación OpenAPI (incluye `/health`). |
| `src/modules/orders/orders.service.spec.ts` | Pruebas unitarias del servicio de pedidos. |
| `API_CONTRACT.md`, `LOGGING_GUIDE.md`, `PLAN_FLUJO_PEDIDOS_REVISION.md`, `README.md` | Documentación. |
| `prisma/migrations/20260518190000_add_operator_is_active/migration.sql` | Ajuste de migración. |

---

## 5. Estado de Docker

**Estado: ✅ Funcional y verificado de extremo a extremo.**

- **Dockerfile:** multi-stage, `node:22-bookworm-slim`. Stage `builder` ejecuta `npm ci` + `npm run build` (`prisma generate && tsc`); stage `runtime` ejecuta `npm start` (`node dist/src/app.js`). Build verificado sin errores.
- **docker-compose.yml:** `postgres` (PostgreSQL 17) → `migrate` (aplica migraciones, sale con código 0) → `api` (puerto 3000). Dependencias condicionales: `api` espera a `postgres` *healthy* y a `migrate` *completed_successfully*.
- **Healthchecks:** `postgres` usa `pg_isready`; `api` usa un check basado en `fetch` de Node 22 (sin depender de `curl`/`wget` en la imagen).
- **Volúmenes:** `postgres_data` (persistencia de DB) y `uploads_data` (archivos subidos en `/app/uploads`). En el stack de test, `postgres-test` usa `tmpfs` (no persiste).
- **Higiene de la imagen:** `.dockerignore` evita que `.env`, `uploads`, `node_modules` local y `.git` entren al contexto de build.

Pendiente menor: el `Dockerfile` no define un usuario no-root (corre como `root`); ver sección 10.

---

## 6. Estado de Prisma y migraciones

**Estado: ✅ Funcional.**

- Prisma 7 con `@prisma/client` y adaptador `@prisma/adapter-pg` sobre un `Pool` de `pg`.
- El Prisma Client se genera en el stage `builder` y viaja en `node_modules/.prisma` hacia la imagen final.
- Migraciones presentes (4): `init`, `sprint4_operator_flow_updates`, `add_operator_is_active`, `order_review_flow`.
- El servicio `migrate` ejecuta `prisma migrate deploy` y termina con código 0 (verificado).
- Configuración (`prisma.config.ts`) define un `seed` (`ts-node prisma/seed.ts`), pero **el seed NO se ejecuta automáticamente** en el arranque ni en las migraciones. Si se requieren datos base en producción, debe correrse manualmente.

---

## 7. Estado de PostgreSQL

**Estado: ✅ Funcional.**

- Imagen oficial `postgres:17`, gestionada por compose con credenciales vía `env_file`.
- `PGDATA` apunta a un subdirectorio del volumen para evitar conflictos de inicialización.
- Healthcheck con `pg_isready` antes de que arranquen `migrate` y `api`.
- En pruebas, instancia separada (`postgres-test`, DB `sigeped_test`) sobre `tmpfs`: efímera y aislada del Postgres del host y del de desarrollo.

Consideración: las credenciales por defecto en las plantillas (`postgres/admin`, `postgres/postgres`) son para desarrollo/pruebas. Producción debe usar secretos fuertes gestionados fuera del repo.

---

## 8. Estado de las pruebas

Suite total verificada: **21 pruebas, 21 pasan (3 suites).**

### Unitarias — 🟡 Parcial
- `src/utils/order.utils.spec.ts` — cálculo de anticipos, fechas estimadas, mapeo modelo→especialidad.
- `src/modules/orders/orders.service.spec.ts` — servicio de pedidos con Prisma mockeado.
- Cobertura limitada a utilidades y un servicio; la mayoría de módulos (auth service, services, materials, operators, payments, admin, notifications) no tienen pruebas unitarias propias.

### Integración — 🟡 Parcial
- `src/modules/auth/auth.controller.spec.ts` — registro y login vía `supertest` contra la app real y la DB.
- Es el **único** módulo con pruebas de integración. El resto de endpoints (pedidos, pagos, operadores, admin, notificaciones) no están cubiertos.

### Rendimiento — ❌ Pendiente
No existen pruebas de rendimiento/carga (no hay k6, Artillery, autocannon ni similar).

### Estrés — ❌ Pendiente
No existen pruebas de estrés.

### Concurrencia — ❌ Pendiente
No existen pruebas de concurrencia. Relevante por la lógica de pedidos y posibles condiciones de carrera en transiciones de estado/pagos.

---

## 9. Estado de seguridad

### Variables de entorno — ✅ / 🟡
- `src/config/env.ts` valida que `DATABASE_URL` y `JWT_SECRET` existan (lanza error si faltan). ✅
- Secretos fuera del repo: `.gitignore` y `.dockerignore` excluyen `.env*`; las plantillas no contienen secretos reales. ✅
- 🟡 No hay validación de fortaleza de `JWT_SECRET` ni gestión de secretos (Vault/Docker secrets); en compose llegan por `env_file` en texto plano.

### CORS — ❌ Inseguro para producción
- `app.use(cors())` sin opciones: **permite todos los orígenes**. `FRONTEND_URL` está definido en el entorno pero **no se usa** para restringir CORS. Debe limitarse al origen del frontend antes de producción.

### JWT — 🟡 Funcional, mejorable
- Firmado con `jwt.sign` usando `JWT_SECRET` y `JWT_EXPIRES_IN` (24h por defecto); verificación en `auth.middleware.ts`. ✅
- Payload mínimo (`id`, `role`, `is_frequent`). Contraseñas con `bcrypt` (cost 10). ✅
- 🟡 Algoritmo no fijado explícitamente (riesgo teórico de confusión de algoritmo); sin refresh tokens ni mecanismo de revocación/blacklist; expiración larga (24h).

### 2FA — ❌ No implementado
- No hay segundo factor (TOTP/OTP/SMS). No se encontró ninguna implementación. Twilio está presente para notificaciones WhatsApp, no para 2FA.

### Otros hallazgos de seguridad
- **Sin rate limiting / protección de fuerza bruta** en login ni en la API en general (no hay `express-rate-limit` ni equivalente). ❌
- `helmet()` activo (cabeceras de seguridad básicas). ✅
- Contenedor corre como `root` (sin usuario dedicado). 🟡

---

## 10. Riesgos pendientes (ordenados por prioridad)

**🔴 Crítico**
- **CORS abierto a todos los orígenes** — exposición a peticiones cross-origin no controladas. Restringir a `FRONTEND_URL`.
- **Sin rate limiting en autenticación** — vulnerable a fuerza bruta y credential stuffing.

**🟠 Alto**
- **Cobertura de pruebas baja** — solo un módulo con integración; regresiones probables al evolucionar.
- **Sin 2FA** — según el perfil de usuarios (admin/operadores) puede ser requisito.
- **JWT sin algoritmo fijado, sin revocación y con expiración de 24h** — mitigar endurecimiento y considerar refresh tokens.

**🟡 Medio**
- **Sin pruebas de concurrencia** en flujos de pedidos/pagos — posibles condiciones de carrera.
- **Contenedor como root** — endurecer con usuario no privilegiado.
- **Gestión de secretos en texto plano** vía `env_file`.

**🟢 Bajo**
- **Imagen no optimizada en tamaño** (incluye devDependencies a propósito para migraciones/tests).
- **Seed no automatizado** — requiere paso manual si se necesitan datos base.

---

## 11. Deuda técnica pendiente

- Cobertura de pruebas desigual: la mayoría de módulos de negocio carecen de pruebas unitarias e integración.
- `FRONTEND_URL` definido pero sin uso real (CORS no lo aplica).
- Imagen Docker monolítica respecto a dev/prod: una sola imagen sirve para API, migraciones y tests. Funciona, pero mezcla responsabilidades y aumenta el tamaño.
- Sin pipeline de CI que ejecute `docker compose -f docker-compose.test.yml` automáticamente.
- Sin estrategia de logging centralizado/observabilidad más allá del middleware actual.
- Seed y datos iniciales no integrados en el flujo de despliegue.

---

## 12. Qué falta para considerar el backend listo para producción

1. Restringir CORS al origen del frontend (usar `FRONTEND_URL`).
2. Añadir rate limiting y protección de fuerza bruta en login y endpoints sensibles.
3. Endurecer JWT: fijar algoritmo, reducir expiración y/o añadir refresh tokens y revocación.
4. Definir y aplicar 2FA si el negocio lo requiere (al menos para roles ADMIN/OPERATOR).
5. Aumentar cobertura de pruebas de integración a todos los módulos críticos (pedidos, pagos, operadores, admin).
6. Añadir pruebas de rendimiento, estrés y concurrencia.
7. Ejecutar el contenedor como usuario no-root y aplicar buenas prácticas de imagen.
8. Gestión de secretos en producción (Docker secrets / gestor externo) en lugar de `env_file` plano.
9. Configurar CI/CD que construya la imagen y corra la suite de test automáticamente.
10. Definir backups y política de retención para el volumen de PostgreSQL.

---

## 13. Qué falta para integrar el frontend Angular

1. Configurar CORS para permitir el origen real del frontend (`http://localhost:4200` en dev y el dominio de producción).
2. Confirmar el contrato de API contra `API_CONTRACT.md` y la spec OpenAPI (`/api/openapi.json`, `/api/docs`).
3. Definir cómo consume el frontend el JWT (almacenamiento, expiración, renovación) — hoy no hay refresh token.
4. Acordar el manejo de archivos subidos (`/app/uploads`): cómo se sirven/exponen al frontend.
5. Documentar y versionar la URL base de la API para los entornos del frontend.
6. Si se añade 2FA, definir el flujo correspondiente en la API antes de que el frontend lo implemente.

---

## 14. Próximos pasos recomendados (en orden)

1. **Commit** de los archivos Docker y de configuración nuevos (hoy están sin versionar).
2. **CORS restringido** a `FRONTEND_URL` (cambio pequeño, riesgo crítico).
3. **Rate limiting** en autenticación.
4. **Ampliar pruebas de integración** a los módulos restantes y elevar cobertura.
5. **Endurecer JWT** y evaluar 2FA según requisitos del negocio.
6. **CI/CD** que ejecute build + `docker-compose.test.yml`.
7. **Pruebas de rendimiento/estrés/concurrencia** sobre los flujos de pedidos y pagos.
8. **Endurecimiento de la imagen** (usuario no-root) y gestión de secretos.
9. **Integración con el frontend Angular** una vez asegurado CORS y el contrato.

---

## 15. Checklist final

| Ítem | Estado |
|---|---|
| Dockerfile multi-stage funcional | ✅ Completado |
| docker-compose (postgres + migrate + api) | ✅ Completado |
| Healthchecks (postgres + api) | ✅ Completado |
| Volúmenes (datos + uploads) | ✅ Completado |
| Higiene de imagen (.dockerignore) | ✅ Completado |
| Prisma Client + migraciones (`migrate deploy`) | ✅ Completado |
| PostgreSQL containerizado e independiente del host | ✅ Completado |
| Endpoint `/health` operativo | ✅ Completado |
| Suite de pruebas en Docker (21/21) | ✅ Completado |
| Validación de variables de entorno requeridas | ✅ Completado |
| Hash de contraseñas (bcrypt) | ✅ Completado |
| Cabeceras de seguridad (helmet) | ✅ Completado |
| Pruebas unitarias | 🟡 Parcial |
| Pruebas de integración | 🟡 Parcial |
| Manejo de secretos en producción | 🟡 Parcial |
| JWT (endurecimiento / refresh / revocación) | 🟡 Parcial |
| Contenedor como usuario no-root | 🟡 Parcial |
| Seed automatizado | 🟡 Parcial |
| CORS restringido al frontend | ❌ Pendiente |
| Rate limiting / anti fuerza bruta | ❌ Pendiente |
| 2FA | ❌ Pendiente |
| Pruebas de rendimiento | ❌ Pendiente |
| Pruebas de estrés | ❌ Pendiente |
| Pruebas de concurrencia | ❌ Pendiente |
| CI/CD | ❌ Pendiente |
| Commit de los archivos Docker | ❌ Pendiente |

---

*Informe generado a partir del análisis del estado real del repositorio. No se realizaron modificaciones de código.*
