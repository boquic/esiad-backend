# Plan de Integración Backend + Frontend Angular (Docker Compose) — SIGEPED

**Fecha:** 2026-06-30
**Objetivo:** integrar `esiad-backend` (este repo) y `esiad-frontend` (Angular v21, repo separado) en un único stack de Docker Compose, comunicados por un reverse proxy, listo para luego automatizar con CI/CD y medir rendimiento.

---

## 1. Arquitectura

Se usa un **reverse proxy con nginx** en el contenedor del frontend. nginx sirve el build estático de Angular y hace proxy de `/api` y `/health` hacia el backend. Resultado: **un solo origen → sin CORS**, y Angular usa rutas relativas (sin URL de API horneada).

```
Navegador → :8080 (frontend / nginx)
                 ├── /            → estático de Angular (SPA)
                 ├── /api/*       → proxy → backend:3000
                 └── /health      → proxy → backend:3000
backend:3000  → postgres:5432   (red interna de Compose)
```

El backend **no** se expone al host; solo nginx lo alcanza por la red interna. Esto reduce superficie de ataque y elimina el problema de CORS abierto detectado en el informe de estado.

### Layout de repos

```
sigeped/
├── esiad-backend/    (este repo — ya tiene Dockerfile ✅)
├── esiad-frontend/   (Angular v21 + Dockerfile con nginx)
└── deploy/
    ├── docker-compose.yml
    ├── nginx.conf
    └── .env.deploy.example
```

> Archivos entregados en `deploy/` de este repo: `docker-compose.yml`, `nginx.conf`, `.env.deploy.example` y `frontend.Dockerfile.example` (referencia para el repo Angular). Para el despliegue real, mover/copiar `deploy/` a la raíz `sigeped/` junto a ambos repos, o ajustar los `build.context`.

---

## 2. Comunicación entre servicios

- Resolución por **nombre DNS de Compose**: el backend es `backend:3000`, la DB es `postgres:5432`. Nunca `localhost` entre contenedores.
- El navegador solo conoce `:8080`; jamás contacta `backend:3000` directamente.
- `migrate` corre `prisma migrate deploy` y debe terminar (exit 0) antes de que arranque `backend` (`depends_on: service_completed_successfully`).
- `frontend` espera a que `backend` esté *healthy*.

---

## 3. Variables de entorno

Distinción clave: **el backend lee variables en runtime; Angular las hornea en build.**

### Backend (runtime, vía `.env.deploy` → `env_file`)
Reutiliza el patrón de `.env.docker.example`. Lo esencial:

- `DATABASE_URL=postgresql://postgres:admin@postgres:5432/sigeped`
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `UPLOAD_PATH=/app/uploads`
- `POSTGRES_DB/USER/PASSWORD` (consumidas por el servicio postgres)
- Twilio vacío si no se usa.
- `FRONTEND_URL=http://localhost:8080` (con reverse proxy ya no es crítico para CORS, se mantiene por coherencia).

### Frontend (build-time)
Con reverse proxy, `environment.prod.ts` apunta a `'/api'` (rutas **relativas**) → **no se inyecta ninguna URL** en el contenedor. Angular compilado no lee variables del entorno del contenedor; si en el futuro se separan orígenes, habría que pasar la URL como `--build-arg` o inyectar un `config.js` en runtime.

Regla: en el frontend, **nunca** `localhost` para hablar con la API; siempre relativo.

---

## 4. Puesta en marcha

```bash
cd deploy
cp .env.deploy.example .env.deploy   # ajustar JWT_SECRET y credenciales
docker compose up --build
# abrir http://localhost:8080
```

El repo `esiad-frontend` debe tener un `Dockerfile` (ver `frontend.Dockerfile.example`) que compile Angular y lo sirva con nginx. La config de proxy (`nginx.conf`) la monta el compose como volumen.

---

## 5. Verificaciones funcionales (compuerta antes de CI/CD y rendimiento)

Ejecutar en orden; cada una habilita la siguiente. Mapean al DoD de `SPRINTS.md`.

1. **Infra arriba:** `postgres` healthy, `migrate` exit 0, `backend` healthy, `frontend` sirviendo en `:8080`.
2. **DNS interno:** desde el contenedor frontend, `backend:3000/health` responde 200.
3. **Proxy / same-origin:** cargar Angular en `:8080` y que una llamada a `/api/...` funcione **sin errores de CORS** en consola (DoD #3).
4. **Auth end-to-end:** registro → login → token → ruta protegida **200 con token** y **401 sin token** (DoD #6).
5. **Roles:** ruta de rol incorrecto devuelve **403** (DoD #6).
6. **Validaciones visibles:** mensajes de error en formularios ante input inválido (DoD #5).
7. **Archivos (gotcha):** subir plano/captura y luego descargarlo/visualizarlo desde el frontend. El backend genera URLs `/uploads/...` pero **no hay `express.static`**; los archivos se sirven por endpoint. Verificar la ruta real de descarga y que el volumen `uploads_data` **persiste** tras reinicio.
8. **Persistencia DB:** `docker compose restart` (o `down` sin `-v` → `up`) y confirmar que los datos siguen.
9. **Smoke de flujos núcleo:** crear pedido → presupuesto → cambio de estado por operario → pago; sin romper sprints previos (DoD #8).
10. **Contrato API:** respuestas coinciden con `API_CONTRACT.md` / OpenAPI.

Solo con 1–10 en verde tiene sentido:
- **CI/CD:** automatizar este mismo levantamiento + suite de tests.
- **Rendimiento:** medir sobre un sistema ya verificado como correcto (medir antes de tener corrección produce números engañosos).

---

## 6. Resumen

Reverse proxy con nginx para unificar origen y eliminar CORS; comunicación por nombres de servicio en la red de Compose; env en runtime para el backend vs build-time (relativo) para Angular; y un checklist de 10 verificaciones funcionales como compuerta previa a la automatización y la medición de rendimiento.
