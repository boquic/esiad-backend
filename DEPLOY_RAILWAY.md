# Despliegue en Railway — SIGEPED

Guía para desplegar el stack (PostgreSQL + backend + frontend Angular) en
[Railway](https://railway.com). Reutiliza los Dockerfiles que ya tienes; los
únicos cambios respecto al compose local son específicos de Railway y ya están
resueltos en los archivos del repo.

## Arquitectura en Railway

Un proyecto de Railway con **tres servicios**:

```
Navegador → frontend (nginx, dominio público)
                 ├── /            → estático de Angular
                 ├── /api/*       → proxy → backend (dominio público)
                 └── /health      → proxy → backend
backend (Express, contenedor siempre activo) → Postgres (privado)
```

El navegador solo ve el dominio del frontend → sigue siendo **mismo-origen, sin
CORS**. A diferencia de plataformas serverless, el backend corre como contenedor
persistente, así que **tus cron jobs (`node-cron`) funcionan sin cambios** y el
**volumen de uploads persiste**.

## TO-BE

La arquitectura objetivo separa claramente presentación, lógica de negocio y
persistencia. El frontend Angular se publica detrás de nginx como único punto de
entrada para el navegador, mientras que el backend Express queda aislado como un
servicio persistente con su propia URL pública dentro del stack de Railway. Esta
disposición mantiene el consumo de la API bajo un mismo origen, reduce problemas
de CORS y permite que el frontend actúe únicamente como capa de presentación.

El backend conserva su rol de núcleo transaccional del sistema: calcula
presupuestos, controla el flujo de pedidos, valida pagos, coordina a los
operarios, emite notificaciones y ejecuta tareas programadas. PostgreSQL se
mantiene como base de datos privada del proyecto, mientras que las subidas de
archivos se almacenan en un volumen persistente para evitar pérdidas entre
despliegues. Con esto, el entorno productivo queda más desacoplado, escalable y
alineado con un despliegue real en producción.

## Requisitos previos

- Cuenta en Railway.
- Ambos repos en GitHub y con los últimos commits pusheados (Docker, 2FA, etc.).
- Archivos ya incluidos para Railway:
  - Frontend: `Dockerfile.railway` y `nginx.railway.conf.template`.
  - Backend: el `Dockerfile` actual sirve tal cual (incluye el CLI de Prisma para migraciones).

---

## Paso 1 — Crear el proyecto y la base de datos

1. En Railway: **New Project**.
2. **Add a Service → Database → PostgreSQL**. Railway lo provisiona y expone
   `DATABASE_URL` y las variables `PG*` en ese servicio.

## Paso 2 — Servicio backend

1. **Add a Service → GitHub Repo → `esiad-backend`**. Railway detecta el `Dockerfile`.
2. **Variables** (Settings → Variables):
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`  *(referencia al servicio Postgres)*
   - `JWT_SECRET` = *(un secreto fuerte)*
   - `JWT_EXPIRES_IN` = `24h`
   - `NODE_ENV` = `production`
   - `UPLOAD_PATH` = `/app/uploads`
   - `UPLOAD_MAX_SIZE_MB` = `20`
   - Twilio: dejar vacías si no se usa.
   - `FRONTEND_URL` = `https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}` *(se completa cuando exista el frontend; opcional con reverse proxy)*
3. **Volumen** (Settings → Volumes): **Add Volume**, mount path `/app/uploads`.
   Así las subidas persisten entre despliegues.
4. **Pre-Deploy Command** (Settings → Deploy): `npm run db:migrate:deploy`.
   Aplica las migraciones antes de arrancar. *(Funciona porque la imagen incluye
   el CLI de Prisma; es el error típico de Railway que aquí ya evitamos.)*
5. **Healthcheck Path** (Settings → Deploy): `/health`.
6. **Networking → Generate Domain** para obtener el dominio público del backend.
   No necesitas cambiar el puerto: la app ya escucha en `process.env.PORT` que
   Railway inyecta.

## Paso 3 — Servicio frontend

1. **Add a Service → GitHub Repo → `esiad-frontend`**.
2. **Variables**:
   - `RAILWAY_DOCKERFILE_PATH` = `Dockerfile.railway`  *(usa el Dockerfile de Railway, no el local)*
   - `BACKEND_ORIGIN` = `https://${{backend.RAILWAY_PUBLIC_DOMAIN}}`
     *(ajusta `backend` al nombre real del servicio del Paso 2)*
3. **Networking → Generate Domain** para el dominio público del frontend.
   nginx escuchará en `$PORT` automáticamente (la plantilla lo resuelve con envsubst).

## Paso 4 — Datos iniciales (opcional)

Para poblar catálogo y usuarios de prueba, ejecuta el seed una vez. En el servicio
backend, abre una shell/one-off command y corre:

```bash
npx prisma db seed
```

(Usuarios del seed: admin `00000000`, clientes `70000001`…`70000005`, todos con
contraseña `sigeped123`.)

---

## Verificación

1. Abre el dominio público del **frontend** → debe cargar la app.
2. Salud de la cadena completa:
   ```bash
   curl https://TU-FRONTEND.up.railway.app/health      # {"status":"ok"}
   ```
3. Auth/roles end-to-end con el script (apuntando al dominio público):
   ```bash
   BASE=https://TU-FRONTEND.up.railway.app bash deploy/verificar.sh
   ```
4. En el navegador: login con un usuario del seed → debe pedir el **QR/código 2FA**.

## Notas y buenas prácticas

- **Migraciones**: `prisma migrate deploy` es idempotente; en cada deploy aplica
  solo lo pendiente.
- **Uploads**: viven en el volumen montado en `/app/uploads`; no los pierdes al
  redeploy. Para escalar a varias réplicas, migrar a almacenamiento de objetos (S3).
- **Cron jobs**: corren dentro del contenedor backend persistente (expirar
  presupuestos, recordatorio de recojo). No requieren configuración extra.
- **Secretos**: usa un `JWT_SECRET` fuerte y credenciales de DB gestionadas por
  Railway; nunca los comitees.
- **CI/CD**: tus workflows de GitHub Actions siguen validando build y tests; Railway
  redepliega automáticamente en cada push a `main`.
- **Alternativa de red**: aquí el frontend proxya al **dominio público** del backend
  por simplicidad. Si prefieres red privada, Railway expone
  `RAILWAY_PRIVATE_DOMAIN` (IPv6); requiere `resolver` en nginx.
