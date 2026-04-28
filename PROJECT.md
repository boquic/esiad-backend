# PROJECT.md — SIGEPED
## Sistema de Gestión de Pedidos para ESIAD Proyectos

---

## 1. RESUMEN EJECUTIVO

**SIGEPED** es una plataforma web integrada con bot de WhatsApp que automatiza el ciclo completo de pedidos para ESIAD Proyectos, empresa dedicada a servicios de arquitectura (corte láser, impresión 3D, ploteos y maquetas).

### ¿Qué hace?
Centraliza la recepción de pedidos mediante registro express con DNI, genera cotizaciones automáticas, asigna tareas a operarios, envía notificaciones vía WhatsApp y permite seguimiento en tiempo real. **Todos los pedidos se recogen en local, sin delivery.**

### ¿Para quién es?

| Tipo de Usuario | Descripción |
|-----------------|-------------|
| **Cliente** | Estudiantes de arquitectura, diseñadores y profesionales |
| **Operario** | Técnicos especializados en corte láser/ploteo o impresión 3D/maquetas |
| **Administrador** | Jonatan Ruiz, dueño del negocio |

### ¿Qué problema resuelve?

| Problema Actual | Solución SIGEPED |
|-----------------|------------------|
| Saturación de WhatsApp con mensajes manuales | Bot automatizado 24/7 + plataforma estructurada |
| Sin visibilidad de métricas del negocio | Dashboard de indicadores en tiempo real |
| Registro repetitivo en cada pedido | Una sola vez: DNI como credencial única |
| Desorganización en asignación de tareas | Dashboard de operarios con cola de trabajo especializada |
| Confusión en condiciones de pago | Reglas automáticas: 50% adelanto (nuevos) vs. contraentrega (frecuentes) |

---

## 2. STACK TECNOLÓGICO

| Capa | Tecnología | Versión |
|------|------------|---------|
| **Frontend** | Angular | v21.2.7 |
| **Estilos** | TailwindCSS | v4.4.2 |
| **Backend** | Node.js + Express | v22.16.0 LTS + v5.2.1 |
| **Base de Datos** | PostgreSQL | v18 |
| **ORM** | Prisma | v7.7 |
| **Autenticación** | JWT (jsonwebtoken) | 9.x |
| **Hash de contraseñas** | bcrypt | 5.x |
| **Subida de archivos** | Multer | 1.x |
| **Notificaciones WhatsApp** | Twilio SDK | latest |
| **Tunnel desarrollo** | ngrok | latest |
| **Export Excel** | xlsx | latest |
| **Deploy** | Despliegue local (Node.js + PostgreSQL nativo) | - |

> **Nota sobre el bot de WhatsApp:** La integración completa del bot conversacional está fuera del alcance del MVP universitario. El Sprint 7 implementa únicamente los 4 mensajes automáticos de notificación vía Twilio. Si Twilio no está configurado, las notificaciones se muestran dentro de la plataforma web.

---

## 3. FLUJO DEL CLIENTE

### Primera vez
```
WhatsApp ESIAD → Bot envía enlace de registro
↓
Ingresa: Nombre, Apellido, DNI, Celular, Contraseña
↓
Accede al sistema → Sube plano AutoCAD (.dwg / .dxf / .pdf)
↓
Sistema calcula presupuesto automático
↓
Cliente Yapea 50% adelanto (ve QR/número en plataforma + sube captura)
↓
Admin valida pago → Pedido pasa a producción
↓
Recibe notificaciones de avance vía WhatsApp (o en plataforma)
↓
Alerta: "Listo para recoger en local"
```

### Cliente frecuente (5+ pedidos exitosos)
```
Ingresa con DNI → Nuevo pedido → Presupuesto → Contraentrega en local (paga al recoger)
```

### Menú rápido WhatsApp

| Opción | Acción |
|--------|--------|
| **1** | Nuevo pedido |
| **2** | Ver estado de pedido actual |
| **3** | Mi historial de pedidos |
| **4** | Hablar con un asesor |

---

## 4. FUNCIONALIDADES POR TIPO DE USUARIO

### 4.1 CLIENTE

| Módulo | Funcionalidades |
|--------|-----------------|
| **Registro/Login** | Registro: Nombre, Apellido, DNI, Celular, Contraseña. Login con DNI o celular |
| **Nuevo Pedido** | Subir planos AutoCAD (.dwg/.dxf/.pdf). Seleccionar tipo de servicio y material. Ver presupuesto calculado automáticamente |
| **Pagos** | Nuevos (0–4 pedidos): ver QR y número de Yape, subir captura de pago. Frecuentes (5+ pedidos): opción contraentrega en local |
| **Mis Pedidos** | Estado en tiempo real. Fecha estimada de entrega. Historial completo. Botón "Reordenar" |
| **Notificaciones** | Historial de notificaciones recibidas. Campana con contador de no leídas en navbar |

### 4.2 OPERARIO

| Módulo | Funcionalidades |
|--------|-----------------|
| **Dashboard de Trabajo** | Cola de pedidos asignados filtrados por su(s) especialidad(es). Priorización por fecha de entrega |
| **Gestión de Pedidos** | Ver detalle completo: planos descargables, especificaciones, material. Cambiar estado: Pendiente → En proceso → Finalizado. Agregar notas internas |
| **Historial Personal** | Pedidos completados con fechas. Tiempo promedio de ejecución |
| **Restricción** | Solo visualiza pedidos de su especialidad. No accede a precios, ganancias ni datos de otros operarios |

### 4.3 ADMINISTRADOR

| Módulo | Funcionalidades |
|--------|-----------------|
| **Gestión de Usuarios** | Crear/editar/eliminar operarios con especialidades. Ver clientes. Habilitar cliente frecuente manualmente |
| **Gestión de Servicios y Precios** | CRUD de tipos de servicios y materiales. Configurar precios y modelo de precios. Activar/desactivar servicios |
| **Validación de Pagos** | Bandeja de capturas de Yape pendientes. Aprobar/rechazar con comentario. Asignar operario al pedido |
| **Dashboard de Indicadores** | Ventas por período. Ranking de servicios. Top clientes. Ganancias y márgenes. Pedidos por estado. Rendimiento de operarios |
| **Gestión de Pedidos** | Reasignar pedidos. Cancelar con motivo. Extender vigencia de presupuestos |
| **Reportes** | Exportar a Excel: ventas, clientes, productividad |

---

## 5. REGLAS DE NEGOCIO

| # | Regla | Descripción |
|---|-------|-------------|
| 1 | **Acceso único por DNI** | El cliente ingresa con su DNI registrado. Alternativa de respaldo: número de celular vinculado al perfil |
| 2 | **Bot como primer filtro** | Todo mensaje entrante al WhatsApp de ESIAD es atendido primero por el bot. Se deriva a humano si el cliente presiona "4" o el sistema detecta 3 intentos fallidos |
| 3 | **Notificaciones automáticas obligatorias** | El sistema envía alertas en 4 momentos: (a) Presupuesto listo, (b) Pago confirmado / Producción iniciada, (c) Pedido listo para recoger, (d) Recordatorio tras 48h sin recojo |
| 4 | **Condición de pago por antigüedad** | Clientes nuevos (0–4 pedidos exitosos): obligatorio 50% de adelanto por Yape. Clientes frecuentes (5+ pedidos exitosos): opción de contraentrega |
| 5 | **Sin delivery, solo recojo en local** | Todos los pedidos finalizan en estado "Listo para recoger". No existe opción de delivery ni envío a domicilio |
| 6 | **Un pedido activo por servicio** | Un cliente no puede tener dos pedidos del mismo tipo de servicio en estado "En proceso" simultáneamente |
| 7 | **Presupuesto con vigencia de 24 horas** | El presupuesto expira si el cliente no confirma en 24 horas. El admin puede extender la vigencia manualmente |

---

## 6. ARQUITECTURA DEL SISTEMA

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    CLIENTE      │     │    OPERARIO     │     │ ADMINISTRADOR   │
│   (Angular)     │     │   (Angular)     │     │   (Angular)     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    API REST (Express)    │
                    │    Node.js v22 LTS       │
                    │  JWT Auth (jsonwebtoken) │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │       Prisma v7.7         │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     PostgreSQL v18       │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Twilio WhatsApp API   │
                    │  (ngrok en desarrollo)  │
                    └─────────────────────────┘
```

---

## 7. ESTRUCTURA DE CARPETAS

```
sigeped/
├── frontend/                           # Angular v21
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/                   # Singleton services, guards, interceptors
│   │   │   │   ├── guards/
│   │   │   │   │   ├── auth.guard.ts
│   │   │   │   │   └── role.guard.ts
│   │   │   │   ├── interceptors/
│   │   │   │   │   └── auth.interceptor.ts
│   │   │   │   └── services/
│   │   │   │       ├── auth.service.ts
│   │   │   │       └── storage.service.ts
│   │   │   ├── shared/                 # Componentes, pipes y directivas reutilizables
│   │   │   │   ├── components/
│   │   │   │   │   ├── navbar/
│   │   │   │   │   ├── sidebar/
│   │   │   │   │   └── status-badge/
│   │   │   │   └── pipes/
│   │   │   ├── features/               # Un módulo por dominio de negocio
│   │   │   │   ├── auth/
│   │   │   │   │   ├── login/
│   │   │   │   │   └── register/
│   │   │   │   ├── client/
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── orders/
│   │   │   │   │   └── payments/
│   │   │   │   ├── operator/
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   └── order-detail/
│   │   │   │   └── admin/
│   │   │   │       ├── dashboard/
│   │   │   │       ├── users/
│   │   │   │       ├── services/
│   │   │   │       ├── payments/
│   │   │   │       └── reports/
│   │   │   └── app.routes.ts
│   │   ├── environments/
│   │   │   ├── environment.ts
│   │   │   └── environment.prod.ts
│   │   └── assets/
│   └── package.json
│
├── backend/                            # Node.js v22 + Express v4
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts             # Prisma client singleton
│   │   │   └── env.ts                  # Variables de entorno tipadas
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts      # Valida JWT
│   │   │   ├── role.middleware.ts      # Restringe por rol
│   │   │   ├── error.middleware.ts     # Manejo global de errores
│   │   │   └── upload.middleware.ts    # Multer: planos e imágenes
│   │   ├── modules/                    # Un módulo por dominio
│   │   │   ├── auth/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   └── auth.service.ts
│   │   │   ├── users/
│   │   │   │   ├── users.routes.ts
│   │   │   │   ├── users.controller.ts
│   │   │   │   └── users.service.ts
│   │   │   ├── orders/
│   │   │   │   ├── orders.routes.ts
│   │   │   │   ├── orders.controller.ts
│   │   │   │   └── orders.service.ts
│   │   │   ├── payments/
│   │   │   │   ├── payments.routes.ts
│   │   │   │   ├── payments.controller.ts
│   │   │   │   └── payments.service.ts
│   │   │   ├── services/               # Tipos de servicios (corte láser, etc.)
│   │   │   │   ├── services.routes.ts
│   │   │   │   ├── services.controller.ts
│   │   │   │   └── services.service.ts
│   │   │   ├── materials/
│   │   │   │   ├── materials.routes.ts
│   │   │   │   ├── materials.controller.ts
│   │   │   │   └── materials.service.ts
│   │   │   ├── operators/
│   │   │   │   ├── operators.routes.ts
│   │   │   │   ├── operators.controller.ts
│   │   │   │   └── operators.service.ts
│   │   │   ├── admin/
│   │   │   │   ├── admin.routes.ts
│   │   │   │   ├── admin.controller.ts
│   │   │   │   └── admin.service.ts
│   │   │   └── notifications/
│   │   │       ├── notifications.routes.ts
│   │   │       ├── notifications.controller.ts
│   │   │       └── notifications.service.ts
│   │   ├── jobs/                       # Tareas programadas
│   │   │   ├── expire-budgets.job.ts   # Marca presupuestos vencidos (RN #7)
│   │   │   └── pickup-reminder.job.ts  # Recordatorio 48h sin recojo (RN #3)
│   │   └── app.ts                      # Entry point Express
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts                     # Datos de prueba
│   │   └── migrations/
│   ├── uploads/                        # Archivos subidos (planos y capturas)
│   └── package.json
│
├── PROJECT.md
├── DATABASE.md
├── SPRINTS.md
├── CURSOR_PROMPT.md
├── .env.example
└── README.md
```

---

## 8. CONVENCIONES DE CÓDIGO

| Aspecto | Convención |
|---------|------------|
| **Idioma** | Todo el código en inglés: variables, funciones, clases, interfaces, comentarios y nombres de archivos |
| **Estilo de nombres** | camelCase para variables y funciones. PascalCase para clases e interfaces. kebab-case para nombres de archivos |
| **TypeScript** | Tipado estricto siempre. Prohibido usar `any`. Usar interfaces para los DTOs de request/response |
| **Endpoints REST** | Sustantivos en plural: `/api/orders`, `/api/users`. Verbos HTTP para las acciones |
| **Respuesta de error** | Siempre la misma estructura: `{ error: true, message: "descripción" }` |
| **Respuesta exitosa** | `{ data: ... }` para un recurso. `{ data: [...], total: N }` para listas |
| **Variables de entorno** | UPPER_SNAKE_CASE. Nunca hardcodear valores sensibles en el código |
| **Imports Angular** | Standalone components siempre. Sin NgModules |

---

## 9. VARIABLES DE ENTORNO (.env.example)

```env
# Base de datos
DATABASE_URL="postgresql://postgres:password@localhost:5432/sigeped"

# Servidor
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=24h

# Twilio WhatsApp
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Archivos
UPLOAD_MAX_SIZE_MB=20
UPLOAD_PATH=./uploads
```

---

## 10. SEGURIDAD

| Aspecto | Implementación |
|---------|----------------|
| **Contraseñas** | Hash con bcrypt, salt rounds = 10 |
| **Sesiones** | JWT con expiración de 24h |
| **Archivos permitidos (planos)** | Solo .dwg, .dxf, .pdf — validado por Multer en el middleware |
| **Archivos permitidos (capturas)** | Solo imágenes (.jpg, .jpeg, .png) — validado por Multer |
| **Acceso a archivos** | La carpeta uploads/ no es pública. Requiere autenticación para descargar |
| **Ownership** | Un usuario no puede acceder ni modificar datos de otro usuario |
| **Secrets** | Nunca hardcodeados en el código. Siempre desde variables de entorno |
| **Errores** | Nunca exponer stack traces ni mensajes internos de Node al cliente |

