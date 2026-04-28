# SPRINTS.md — SIGEPED
## Plan de Desarrollo · 2 meses · 3-4 horas/día

---

## RESUMEN GENERAL

| Sprint | Nombre | Duración | Entregable |
|--------|--------|----------|------------|
| 0 | Setup e infraestructura | 3 días | Proyecto corriendo localmente |
| 1 | Autenticación y roles | 5 días | Login/registro funcional con JWT |
| 2 | Catálogo: servicios y materiales | 4 días | CRUD de servicios y materiales (admin) |
| 3 | Flujo de pedidos — cliente | 7 días | Cliente puede crear pedido y ver presupuesto |
| 4 | Flujo de pedidos — operario | 5 días | Operario gestiona su cola de trabajo |
| 5 | Flujo de pagos | 5 días | Subida de captura y validación por admin |
| 6 | Dashboard de admin | 7 días | Indicadores, reportes y gestión completa |
| 7 | Notificaciones (simuladas) | 4 días | Notificaciones en plataforma + Twilio básico |
| 8 | Pulido, testing y entrega | 5 días | App estable lista para presentar |

**Total estimado: 45 días hábiles ≈ 9 semanas**
> Con 2 meses disponibles tienes margen de seguridad para imprevistos.

---

## DEFINITION OF DONE (DoD) — GLOBAL
Estas condiciones aplican a TODOS los sprints sin excepción.
Un sprint no está terminado hasta que se cumplan todas.

| # | Condición |
|---|-----------|
| 1 | Todas las tareas del sprint están marcadas como completadas |
| 2 | El criterio de aceptación del sprint fue verificado manualmente paso a paso |
| 3 | No hay errores en la consola del navegador ni en los logs del backend |
| 4 | Los endpoints nuevos fueron probados en Postman o Thunder Client con casos válidos e inválidos |
| 5 | Los inputs de los formularios tienen validación visible (mensajes de error en pantalla) |
| 6 | Las rutas protegidas retornan 401 sin token y 403 con token de rol incorrecto |
| 7 | El código nuevo sigue las convenciones definidas en PROJECT.md (inglés, tipado estricto, sin any) |
| 8 | No se rompió ninguna funcionalidad de sprints anteriores (smoke test manual) |
| 9 | Los archivos creados están en las rutas definidas en PROJECT.md |
| 10 | El .env.example está actualizado si se agregaron nuevas variables de entorno |

---

## REGLA DE ORO PARA USAR CON CURSOR

> Al iniciar cada sesión en Cursor, pega siempre:
> *"Lee PROJECT.md, DATABASE.md y SPRINTS.md. Estamos en el Sprint X — [nombre]. Solo trabajaremos en: [tarea puntual del sprint]. No toques archivos fuera del alcance."*

---

## SPRINT 0 — Setup e infraestructura
**Duración:** 3 días
**Objetivo:** El proyecto compila y corre localmente. Sin lógica de negocio aún.

### Tareas
- [ ] Inicializar repositorio Git con estructura de carpetas definida en `PROJECT.md`
- [ ] Configurar `backend/`: Node.js v22 + Express v4 + TypeScript + Prisma v6
- [ ] Configurar `frontend/`: Angular v19 + TailwindCSS v3.4
- [ ] Configurar base de datos PostgreSQL local v18 y crear base de datos `sigeped`
- [ ] Crear `.env` con variables: `DATABASE_URL`, `JWT_SECRET`, `PORT`
- [ ] Ejecutar `prisma migrate dev` con el schema completo de `DATABASE.md`
- [ ] Verificar conexión backend ↔ PostgreSQL con ruta de prueba `GET /health`
- [ ] Verificar que Angular compila y muestra página en blanco sin errores

### Criterio de aceptación
PostgreSQL local corriendo. `npm run dev` en backend responde `200 OK` en `/health`. Angular corre en `localhost:4200` sin errores en consola.

### Archivos que se crean en este sprint
```

.env.example
backend/src/app.ts
backend/src/config/env.ts
backend/src/config/database.ts
backend/prisma/schema.prisma
backend/prisma/migrations/
frontend/src/app/app.routes.ts
frontend/src/environments/environment.ts
```

### DoD específico — Sprint 0
- [ ] La base de datos PostgreSQL local acepta conexiones correctamente
- [ ] `GET /health` responde `{ status: "ok" }` con código 200
- [ ] `npx prisma studio` abre y muestra todas las tablas del schema
- [ ] `ng serve` compila Angular sin errores ni warnings críticos
- [ ] La estructura de carpetas del proyecto coincide exactamente con PROJECT.md

---

## SPRINT 1 — Autenticación y roles
**Duración:** 5 días
**Objetivo:** Un usuario puede registrarse, iniciar sesión y acceder a rutas protegidas según su rol.

### Tareas
- [ ] `POST /api/auth/register` — registro con DNI, nombre, apellido, celular, contraseña
- [ ] `POST /api/auth/login` — login con DNI o celular + contraseña, retorna JWT
- [ ] Middleware `auth.middleware.ts` — valida JWT en headers
- [ ] Middleware `role.middleware.ts` — restringe rutas por rol (CLIENT / OPERATOR / ADMIN)
- [ ] Interceptor Angular — adjunta JWT automáticamente a todas las peticiones HTTP
- [ ] Guard Angular — redirige según rol al hacer login (3 rutas base distintas)
- [ ] Página de registro (formulario: nombre, apellido, DNI, celular, contraseña)
- [ ] Página de login (formulario: DNI o celular + contraseña)
- [ ] Página placeholder para cada rol: `/client/dashboard`, `/operator/dashboard`, `/admin/dashboard`

### Criterio de aceptación
- Un cliente se registra, inicia sesión y ve `/client/dashboard`.
- Un operario creado manualmente en BD inicia sesión y ve `/operator/dashboard`.
- Acceder a `/admin/dashboard` sin JWT retorna `401`. Acceder con JWT de cliente retorna `403`.

### Archivos que se crean en este sprint
```
backend/src/modules/auth/auth.routes.ts
backend/src/modules/auth/auth.controller.ts
backend/src/modules/auth/auth.service.ts
backend/src/middlewares/auth.middleware.ts
backend/src/middlewares/role.middleware.ts
frontend/src/app/core/services/auth.service.ts
frontend/src/app/core/interceptors/auth.interceptor.ts
frontend/src/app/core/guards/auth.guard.ts
frontend/src/app/core/guards/role.guard.ts
frontend/src/app/features/auth/login/
frontend/src/app/features/auth/register/
```

### Reglas de negocio aplicadas
- RN #1: El DNI y el celular deben ser únicos en BD. El backend retorna error descriptivo si ya existen.
- Contraseña hasheada con bcrypt, salt rounds = 10.
- JWT expira en 24h.

### DoD específico — Sprint 1
- [ ] `POST /api/auth/register` con DNI duplicado retorna `409 Conflict` con mensaje claro
- [ ] `POST /api/auth/register` con campos vacíos retorna `400 Bad Request`
- [ ] `POST /api/auth/login` con credenciales incorrectas retorna `401 Unauthorized`
- [ ] `POST /api/auth/login` exitoso retorna JWT válido decodificable en jwt.io
- [ ] Ruta protegida sin token → `401`. Con token de rol incorrecto → `403`
- [ ] El guard Angular redirige a `/client/dashboard`, `/operator/dashboard` o `/admin/dashboard` según rol
- [ ] Recargar la página mantiene la sesión activa (token persistido correctamente)
- [ ] El formulario de registro muestra errores en pantalla si los campos no cumplen el formato

---

## SPRINT 2 — Catálogo: servicios y materiales
**Duración:** 4 días
**Objetivo:** El admin puede gestionar los tipos de servicios y sus materiales con precios.

### Tareas
- [ ] `GET /api/services` — lista todos los servicios activos (público)
- [ ] `POST /api/services` — crear servicio (solo admin)
- [ ] `PATCH /api/services/:id` — editar servicio (solo admin)
- [ ] `PATCH /api/services/:id/toggle` — activar/desactivar servicio (solo admin)
- [ ] `GET /api/materials?serviceTypeId=` — lista materiales de un servicio
- [ ] `POST /api/materials` — crear material con precio unitario (solo admin)
- [ ] `PATCH /api/materials/:id` — editar material (solo admin)
- [ ] `PATCH /api/materials/:id/toggle` — activar/desactivar material (solo admin)
- [ ] Vistas admin: tabla de servicios con botón de edición y toggle
- [ ] Vistas admin: tabla de materiales filtrada por servicio seleccionado

### Criterio de aceptación
El admin puede crear un servicio "Corte Láser" con `pricing_model = PER_UNIT`, agregar un material "MDF 3mm" con precio 5.50 por unidad, y desactivar ese material sin eliminarlo.

### Archivos que se crean en este sprint
```
backend/src/modules/services/
backend/src/modules/materials/
frontend/src/app/features/admin/services/
```

### DoD específico — Sprint 2
- [ ] `POST /api/services` sin token de admin retorna `403`
- [ ] `POST /api/services` con nombre duplicado retorna `409 Conflict`
- [ ] `GET /api/services` retorna solo servicios con `is_active = true`
- [ ] Un servicio desactivado no aparece en el selector de nuevo pedido (Sprint 3 lo usará)
- [ ] Un material desactivado no aparece en el selector de materiales
- [ ] Los precios se guardan y muestran con 2 decimales (ej: 5.50, no 5.5 ni 5.500)
- [ ] La tabla de servicios en el frontend muestra el estado activo/inactivo visualmente

---

## SPRINT 3 — Flujo de pedidos — cliente
**Duración:** 7 días
**Objetivo:** El cliente puede crear un pedido, subir su plano y ver el presupuesto generado.

### Tareas
- [ ] `POST /api/orders` — crear pedido: valida RN#6, asigna `payment_condition` según `is_frequent`, calcula `estimated_price`, fija `budget_expires_at = now + 24h`
- [ ] `GET /api/orders/my` — lista pedidos del cliente autenticado con estado actual
- [ ] `GET /api/orders/:id` — detalle de un pedido
- [ ] `POST /api/orders/:id/files` — subir plano (Multer, solo .dwg/.dxf/.pdf, máx 20MB)
- [ ] `POST /api/orders/:id/confirm` — cliente confirma el presupuesto
- [ ] Formulario "Nuevo pedido": selector de servicio → selector de material → campos según `pricing_model` → preview de presupuesto en tiempo real
- [ ] Vista "Mis pedidos": lista con badge de estado por `OrderStatus`
- [ ] Vista "Detalle de pedido": información completa, estado, archivo subido, presupuesto
- [ ] Job básico: marcar pedidos como `EXPIRED` si `budget_expires_at` fue superado

### Criterio de aceptación
- El cliente selecciona "Ploteo", material "Bond 90g", ingresa 2.5 m², el sistema calcula el precio automáticamente.
- El cliente sube un `.pdf`, confirma el pedido y el estado cambia a `PENDING_PAYMENT`.
- Si intenta crear un segundo pedido de "Ploteo" mientras tiene uno `IN_PROGRESS`, el sistema lo bloquea.

### Archivos que se crean en este sprint
```
backend/src/modules/orders/
backend/src/middlewares/upload.middleware.ts
backend/uploads/
frontend/src/app/features/client/orders/
frontend/src/app/features/client/dashboard/
```

### Reglas de negocio aplicadas
- RN #4: `payment_condition` asignado automáticamente al crear pedido.
- RN #5: La UI no muestra ninguna opción de delivery.
- RN #6: Validación de pedido activo duplicado por tipo de servicio.
- RN #7: `budget_expires_at` fijado a 24h. Job marca expirados.

### DoD específico — Sprint 3
- [ ] Subir un archivo `.exe` o `.jpg` como plano retorna `400` con mensaje "formato no permitido"
- [ ] Subir un archivo mayor a 20MB retorna `413`
- [ ] Crear un segundo pedido del mismo servicio con uno `IN_PROGRESS` retorna `409` con mensaje de RN#6
- [ ] El presupuesto calculado en pantalla coincide exactamente con el valor guardado en BD
- [ ] El campo `payment_condition` en BD es `ADVANCE_50` para clientes con menos de 5 pedidos
- [ ] Un pedido con `budget_expires_at` vencido aparece con estado `EXPIRED` en "Mis pedidos"
- [ ] El cliente frecuente (5+ pedidos) ve la opción de contraentrega en el flujo de confirmación
- [ ] No existe ningún campo, botón ni mención de "delivery" o "envío a domicilio" en la UI

---

## SPRINT 4 — Flujo de pedidos — operario
**Duración:** 5 días
**Objetivo:** El operario ve su cola de trabajo filtrada por especialidad y gestiona el estado de sus pedidos.

### Tareas
- [ ] `GET /api/operator/orders` — pedidos asignados al operario autenticado, filtrados por especialidad
- [ ] `GET /api/operator/orders/:id` — detalle con planos descargables
- [ ] `PATCH /api/operator/orders/:id/status` — cambiar estado: `IN_PROGRESS` → `READY`
- [ ] `PATCH /api/operator/orders/:id/notes` — agregar notas internas
- [ ] Vista operario: lista de pedidos asignados con prioridad por fecha estimada
- [ ] Vista operario: detalle con botón de descarga del plano y cambio de estado
- [ ] Vista operario: historial de pedidos completados con estadísticas básicas

### Criterio de aceptación
- El operario de especialidad LASER solo ve pedidos de "Corte Láser" asignados a él.
- Puede descargar el plano, marcar el pedido como `READY` y agregar una nota interna.
- No puede ver precios, ganancias ni pedidos de otros operarios.

### Archivos que se crean en este sprint
```
backend/src/modules/operators/
frontend/src/app/features/operator/
```

### DoD específico — Sprint 4
- [ ] Un operario LASER no ve pedidos de tipo "Ploteo" ni "Impresión 3D" en su cola
- [ ] Un operario no puede cambiar el estado de un pedido que no le fue asignado (retorna `403`)
- [ ] Un operario no puede cambiar estado hacia atrás (ej: de `READY` a `IN_PROGRESS`) — retorna `400`
- [ ] La vista del operario no muestra ningún campo de precio, costo ni ganancia
- [ ] El plano es descargable desde la vista de detalle sin errores
- [ ] Las notas internas del operario no son visibles para el cliente en ninguna vista
- [ ] Los pedidos se ordenan por fecha estimada de entrega (más urgente primero)

---

## SPRINT 5 — Flujo de pagos
**Duración:** 5 días
**Objetivo:** El cliente sube su captura de Yape y el admin la aprueba o rechaza.

### Tareas
- [ ] `POST /api/payments` — cliente sube captura de Yape (Multer, solo imágenes)
- [ ] `GET /api/admin/payments/pending` — admin ve bandeja de capturas pendientes
- [ ] `PATCH /api/admin/payments/:id/approve` — admin aprueba, pedido pasa a `IN_PROGRESS`
- [ ] `PATCH /api/admin/payments/:id/reject` — admin rechaza con comentario obligatorio
- [ ] `PATCH /api/admin/orders/:id/assign` — admin asigna operario al pedido
- [ ] Vista cliente: pantalla de pago con QR de Yape + campo para subir captura
- [ ] Vista admin: bandeja de pagos pendientes con imagen de captura visible
- [ ] Vista admin: botones aprobar/rechazar con campo de comentario para rechazo

### Criterio de aceptación
- El cliente sube una captura JPG. Aparece en la bandeja del admin con estado `PENDING`.
- Admin aprueba → pedido cambia a `IN_PROGRESS`, operario lo ve en su cola.
- Admin rechaza con comentario → cliente puede ver el motivo y volver a subir captura.

### Archivos que se crean en este sprint
```
backend/src/modules/payments/
frontend/src/app/features/client/payments/
frontend/src/app/features/admin/payments/
```

### DoD específico — Sprint 5
- [ ] Subir una captura en formato `.pdf` o `.dwg` retorna `400` (solo se aceptan imágenes)
- [ ] Rechazar un pago sin ingresar `admin_comment` retorna `400`
- [ ] Aprobar un pago cambia el estado del pedido a `IN_PROGRESS` en BD (verificar en Prisma Studio)
- [ ] Un cliente no puede subir una segunda captura si ya tiene una `PENDING` para el mismo pedido
- [ ] La imagen de la captura es visible en la bandeja del admin (no solo el nombre del archivo)
- [ ] El cliente puede ver el comentario de rechazo desde la vista de detalle de su pedido
- [ ] El admin puede asignar el pedido a un operario cuya especialidad coincida con el servicio

---

## SPRINT 6 — Dashboard de administrador
**Duración:** 7 días
**Objetivo:** El admin tiene visibilidad completa del negocio con métricas e indicadores.

### Tareas
- [ ] `GET /api/admin/stats/sales` — ventas totales por período
- [ ] `GET /api/admin/stats/services` — ranking de servicios más solicitados
- [ ] `GET /api/admin/stats/clients` — top 10 clientes por pedidos completados
- [ ] `GET /api/admin/stats/operators` — pedidos atendidos y tiempo promedio por operario
- [ ] `GET /api/admin/stats/orders-by-status` — distribución de pedidos por estado
- [ ] Vista admin: tarjetas de KPIs (ventas totales, pedidos activos, pedidos listos para recoger)
- [ ] Vista admin: gráfico de barras de servicios más frecuentes
- [ ] Vista admin: gráfico de línea de ventas por período con selector de rango
- [ ] Vista admin: tabla de pedidos con filtros por estado y fecha
- [ ] Vista admin: gestión de usuarios (crear/editar/eliminar operarios, ver clientes)
- [ ] Vista admin: habilitar cliente frecuente manualmente
- [ ] Export a Excel de pedidos con librería `xlsx`

### Criterio de aceptación
El admin ve el total de ventas del mes, filtra pedidos por estado, crea un operario con especialidades LASER y PLOTTING, y exporta la lista de pedidos a Excel.

### Archivos que se crean en este sprint
```
backend/src/modules/admin/
frontend/src/app/features/admin/dashboard/
frontend/src/app/features/admin/users/
frontend/src/app/features/admin/reports/
```

### DoD específico — Sprint 6
- [ ] Las cifras de ventas en el dashboard coinciden con los registros reales en la tabla `payments`
- [ ] El selector de rango de fechas filtra correctamente (probar: hoy, esta semana, este mes)
- [ ] Crear un operario sin especialidad retorna `400`
- [ ] Eliminar un operario con pedidos `IN_PROGRESS` activos retorna `409` con mensaje claro
- [ ] Habilitar cliente frecuente manualmente actualiza `is_frequent = true` en BD
- [ ] El archivo Excel exportado se puede abrir en LibreOffice/Excel y contiene las columnas correctas
- [ ] Un cliente no puede acceder a ninguna ruta `/api/admin/*` (retorna `403`)
- [ ] Los gráficos se renderizan correctamente con datos reales (no datos hardcodeados)

---

## SPRINT 7 — Notificaciones (simuladas)
**Duración:** 4 días
**Objetivo:** El sistema notifica al cliente en los 4 momentos clave.

### Tareas
- [ ] Servicio `NotificationService`: función `send(orderId, triggerEvent)`
- [ ] Integrar en los 4 puntos del flujo: `BUDGET_READY`, `PAYMENT_CONFIRMED`, `ORDER_READY`, `PICKUP_REMINDER_48H`
- [ ] Configurar Twilio SDK con credenciales en `.env`
- [ ] Mensajes WhatsApp con plantilla de texto por evento
- [ ] Fallback: si Twilio falla, guardar en BD con `delivery_status = FAILED` y mostrar en plataforma
- [ ] Job cada hora: detectar pedidos `READY` con +48h → enviar `PICKUP_REMINDER_48H`
- [ ] Vista cliente: sección "Notificaciones" con historial de mensajes recibidos
- [ ] Campana de notificaciones en navbar con contador de no leídas

### Criterio de aceptación
Al aprobar un pago, el cliente recibe notificación en WhatsApp o en plataforma. El registro queda en la tabla `notifications` con el estado correcto.

### Archivos que se crean en este sprint
```
backend/src/modules/notifications/
frontend/src/app/shared/components/navbar/
```

### Reglas de negocio aplicadas
- RN #3: Los 4 eventos de notificación son obligatorios.

### DoD específico — Sprint 7
- [ ] Al aprobar un pago, se crea un registro en la tabla `notifications` con `trigger_event = PAYMENT_CONFIRMED`
- [ ] Al marcar pedido como `READY`, se crea registro con `trigger_event = ORDER_READY`
- [ ] Si Twilio no está configurado, `delivery_status` se guarda como `FAILED` (no lanza excepción no controlada)
- [ ] La campana en navbar muestra el número de notificaciones no leídas
- [ ] El historial de notificaciones del cliente muestra fecha, evento y mensaje
- [ ] Un pedido en estado `READY` por más de 48h aparece con el recordatorio en el historial

---

## SPRINT 8 — Pulido, testing y entrega
**Duración:** 5 días
**Objetivo:** La aplicación está estable, sin errores visibles y lista para presentar.

### Tareas
- [ ] Revisar flujos completos de punta a punta (los 3 roles)
- [ ] Middleware de errores global en backend con mensajes consistentes
- [ ] Validación de inputs en todos los formularios Angular
- [ ] Estados de carga (spinners/skeletons) en todas las peticiones HTTP
- [ ] Toasts de éxito/error en todas las acciones del usuario
- [ ] Verificar responsive en móvil y desktop
- [ ] Seed de datos de prueba: 1 admin, 2 operarios, 5 clientes, servicios y materiales base
- [ ] Documentar `README.md`: levantar el proyecto localmente paso a paso
- [ ] Ensayo de demo completa de punta a punta

### Criterio de aceptación
La demo completa fluye sin errores. Un evaluador puede levantar el proyecto ejecutando la base de datos local y `npm run dev` siguiendo el README.

### DoD específico — Sprint 8 (checklist de entrega)

**Backend**
- [ ] Todos los endpoints retornan errores con la misma estructura JSON: `{ error: true, message: "..." }`
- [ ] No hay rutas que retornen stack traces o errores internos de Node al cliente
- [ ] El seed corre sin errores con `npx prisma db seed`
- [ ] No hay `console.log` de depuración en el código final

**Frontend**
- [ ] Ninguna acción del usuario queda sin feedback visual (spinner, toast o mensaje)
- [ ] Ningún formulario puede enviarse con campos requeridos vacíos
- [ ] La app no muestra pantallas en blanco al recargar en cualquier ruta
- [ ] Las vistas se ven correctamente en 375px (móvil) y 1280px (desktop)

**Flujos completos verificados (smoke test)**
- [ ] Flujo cliente nuevo: registro → nuevo pedido → subir plano → subir captura → ver estado `PENDING_PAYMENT`
- [ ] Flujo admin: aprobar pago → asignar operario → ver pedido en dashboard
- [ ] Flujo operario: ver pedido en cola → descargarlo → marcarlo como `READY`
- [ ] Flujo cliente frecuente: login → nuevo pedido → ver opción contraentrega
- [ ] Flujo notificaciones: pedido `READY` → notificación visible en plataforma

**Seguridad mínima**
- [ ] No se puede acceder a datos de otro usuario modificando el ID en la URL
- [ ] Los archivos en la carpeta `uploads/` no son accesibles sin autenticación
- [ ] El JWT secret no está hardcodeado en el código (viene del `.env`)

**Documentación**
- [ ] El `README.md` tiene instrucciones para levantar el proyecto en menos de 10 pasos
- [ ] El `.env.example` tiene todas las variables necesarias con comentarios descriptivos

---

## RESUMEN DE REGLAS DE NEGOCIO POR SPRINT

| Regla | Sprint donde se implementa |
|-------|---------------------------|
| RN #1 — DNI único como credencial | Sprint 1 |
| RN #2 — Bot como primer filtro WhatsApp | Fuera del alcance (simulado) |
| RN #3 — 4 notificaciones automáticas obligatorias | Sprint 7 |
| RN #4 — Condición de pago por antigüedad | Sprint 3 |
| RN #5 — Sin delivery, solo recojo en local | Sprint 3 (UI: no mostrar opción) |
| RN #6 — Un pedido activo por tipo de servicio | Sprint 3 |
| RN #7 — Presupuesto con vigencia 24h | Sprint 3 |

