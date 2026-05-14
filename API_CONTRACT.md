# API Contract

Este documento describe todos los endpoints expuestos por el backend (según la implementación actual) y muestra ejemplos reales de request/responses.

Nota: la documentación refleja las respuestas tal como están implementadas en los controladores (por ejemplo: `{ data: ... }` en success y `{ error: true, message: ... }` en errores).

Base URL: `/api`

Convención global (aplicable cuando el endpoint devuelve JSON):

```json
{
  "data": {},
  "total": 0
}
```

Errores (implementación actual):

```json
{
  "error": true,
  "message": "Descripción del error"
}
```

---

## POST /api/auth/register

### Descripción

Registrar un usuario cliente.

### Request Body

```json
{
  "dni": "12345678",
  "first_name": "Juan",
  "last_name": "Perez",
  "phone": "987654321",
  "password": "secret123"
}
```

### Query Params

| Param | Tipo | Requerido | Descripción |
| ----- | ---- | --------- | ----------- |

### Response 200

```json
{}
```

### Response 400

```json
{
  "error": true,
  "message": "Todos los campos son requeridos"
}
```

### Response 401

```json
{
  "error": true,
  "message": "Acceso no autorizado, token no proporcionado"
}
```

### Response 500

```json
{
  "error": true,
  "message": "Error interno del servidor"
}
```

Nota: en éxito el controlador responde con `201` y el cuerpo tiene la forma `{ "data": <user> }`. Ejemplo de `data` (campo `password_hash` NO se incluye):

```json
{
  "data": {
    "id": "uuid-user-1",
    "dni": "12345678",
    "first_name": "Juan",
    "last_name": "Perez",
    "phone": "987654321",
    "role": "CLIENT",
    "completed_orders_count": 0,
    "is_frequent": false,
    "created_at": "2026-05-13T12:00:00.000Z"
  }
}
```

---

## POST /api/auth/login

### Descripción

Login de usuario. Acepta `identifier` (dni o teléfono) o `dni` / `phone` directamente.

### Request Body

```json
{
  "identifier": "12345678",
  "password": "secret123"
}
```

### Query Params

| Param | Tipo | Requerido | Descripción |
| ----- | ---- | --------- | ----------- |

### Response 200

```json
{
  "data": {
    "user": {
      "id": "uuid-user-1",
      "dni": "12345678",
      "first_name": "Juan",
      "last_name": "Perez",
      "phone": "987654321",
      "role": "CLIENT",
      "completed_orders_count": 0,
      "is_frequent": false,
      "created_at": "2026-05-13T12:00:00.000Z"
    },
    "token": "<jwt-token>"
  }
}
```

### Response 400

```json
{
  "error": true,
  "message": "El identificador y la contrasena son requeridos"
}
```

### Response 401

```json
{
  "error": true,
  "message": "Credenciales invalidas"
}
```

### Response 500

```json
{
  "error": true,
  "message": "Error interno del servidor"
}
```

---

## GET /api/services

### Descripción

Listar servicios activos (o incluir inactivos con `?includeInactive=true`).

### Request Body

```json
{}
```

### Query Params

| Param | Tipo | Requerido | Descripción |
| ----- | ---- | --------- | ----------- |
| includeInactive | boolean | no | `true` para incluir servicios inactivos |

### Response 200

```json
{
  "data": [
    {
      "id": "uuid-service-1",
      "name": "Corte Láser",
      "pricing_model": "PER_UNIT",
      "is_active": true,
      "created_at": "2026-01-01T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

### Response 400

```json
{
  "error": true,
  "message": "El modelo de precios no es valido"
}
```

### Response 401

```json
{
  "error": true,
  "message": "Acceso no autorizado, token no proporcionado"
}
```

### Response 500

```json
{
  "error": true,
  "message": "Error interno del servidor"
}
```

---

## POST /api/services

### Descripción

Crear un nuevo tipo de servicio (requiere rol `ADMIN`).

### Request Body

```json
{
  "name": "Impresión 3D",
  "pricing_model": "PER_VOLUME"
}
```

### Query Params

| Param | Tipo | Requerido | Descripción |
| ----- | ---- | --------- | ----------- |

### Response 200

```json
{}
```

### Response 400

```json
{
  "error": true,
  "message": "El nombre y el modelo de precios son requeridos"
}
```

### Response 401

```json
{
  "error": true,
  "message": "Acceso no autorizado, token no proporcionado"
}
```

### Response 500

```json
{
  "error": true,
  "message": "Error interno del servidor"
}
```

Ejemplo de `201` (body real devuelto):

```json
{
  "data": {
    "id": "uuid-service-2",
    "name": "Impresión 3D",
    "pricing_model": "PER_VOLUME",
    "is_active": true,
    "created_at": "2026-05-13T12:00:00.000Z"
  }
}
```

---

## PATCH /api/services/:id

### Descripción

Actualizar un servicio (requiere rol `ADMIN`).

### Request Body

```json
{
  "name": "Nuevo nombre",
  "pricing_model": "FIXED",
  "is_active": true
}
```

### Query Params

| Param | Tipo | Requerido | Descripción |
| ----- | ---- | --------- | ----------- |

### Response 200

```json
{
  "data": {
    "id": "uuid-service-2",
    "name": "Nuevo nombre",
    "pricing_model": "FIXED",
    "is_active": true
  }
}
```

### Response 400

```json
{
  "error": true,
  "message": "El modelo de precios no es valido"
}
```

### Response 404

```json
{
  "error": true,
  "message": "Servicio no encontrado"
}
```

### Response 500

```json
{
  "error": true,
  "message": "Error interno del servidor"
}
```

---

## PATCH /api/services/:id/toggle

### Descripción

Alternar `is_active` del servicio (requiere rol `ADMIN`).

### Request Body

```json
{}
```

### Query Params

| Param | Tipo | Requerido | Descripción |
| ----- | ---- | --------- | ----------- |

### Response 200

```json
{
  "data": {
    "id": "uuid-service-2",
    "name": "Impresión 3D",
    "pricing_model": "PER_VOLUME",
    "is_active": false
  }
}
```

### Response 404

```json
{
  "error": true,
  "message": "Servicio no encontrado"
}
```

### Response 500

```json
{
  "error": true,
  "message": "Error interno del servidor"
}
```

---

## GET /api/materials

### Descripción

Listar materiales. Opcional `serviceTypeId` y `includeInactive=true`.

### Request Body

```json
{}
```

### Query Params

| Param | Tipo | Requerido | Descripción |
| ----- | ---- | --------- | ----------- |
| serviceTypeId | string | no | Filtrar por `service_type_id` |
| includeInactive | boolean | no | `true` para incluir inactivos |

### Response 200

```json
{
  "data": [
    {
      "id": "uuid-material-1",
      "service_type": { "name": "Corte Láser" },
      "name": "Acrílico 3mm",
      "unit_price": "12.50",
      "unit": "m2",
      "is_active": true
    }
  ],
  "total": 1
}
```

### Response 500

```json
{
  "error": true,
  "message": "Error interno del servidor"
}
```

---

## POST /api/materials

### Descripción

Crear material (requiere rol `ADMIN`).

### Request Body

```json
{
  "service_type_id": "uuid-service-1",
  "name": "Acrílico 3mm",
  "unit_price": "12.50",
  "unit": "m2"
}
```

### Query Params

| Param | Tipo | Requerido | Descripción |
| ----- | ---- | --------- | ----------- |

### Response 201

```json
{
  "data": {
    "id": "uuid-material-1",
    "service_type_id": "uuid-service-1",
    "name": "Acrílico 3mm",
    "unit_price": "12.50",
    "unit": "m2",
    "is_active": true
  }
}
```

### Response 400

```json
{
  "error": true,
  "message": "Todos los campos son requeridos"
}
```

### Response 404

```json
{
  "error": true,
  "message": "Tipo de servicio no encontrado"
}
```

### Response 409

```json
{
  "error": true,
  "message": "El material ya existe para este tipo de servicio"
}
```

---

## PATCH /api/materials/:id

### Descripción

Actualizar material (requiere rol `ADMIN`).

### Request Body

```json
{
  "name": "Acrílico 4mm",
  "unit_price": "14.00",
  "unit": "m2",
  "is_active": true
}
```

### Query Params

| Param | Tipo | Requerido | Descripción |
| ----- | ---- | --------- | ----------- |

### Response 200

```json
{
  "data": {
    "id": "uuid-material-1",
    "name": "Acrílico 4mm",
    "unit_price": "14.00",
    "unit": "m2",
    "is_active": true
  }
}
```

### Response 404

```json
{
  "error": true,
  "message": "Material no encontrado"
}
```

### Response 409

```json
{
  "error": true,
  "message": "El material ya existe para este tipo de servicio"
}
```

### Response 500

```json
{
  "error": true,
  "message": "Error interno del servidor"
}
```

---

## PATCH /api/materials/:id/toggle

### Descripción

Alternar `is_active` del material (requiere rol `ADMIN`).

### Request Body

```json
{}
```

### Response 200

```json
{
  "data": {
    "id": "uuid-material-1",
    "is_active": false
  }
}
```

### Response 404

```json
{
  "error": true,
  "message": "Material no encontrado"
}
```

---

## POST /api/orders

### Descripción

Crear un pedido (requiere rol `CLIENT`). La combinación de campos `quantity` / `area` / `volume` depende del `pricing_model` del servicio.

### Request Body

```json
{
  "service_type_id": "uuid-service-1",
  "material_id": "uuid-material-1",
  "quantity": 10,
  "notes": "Cortar piezas"
}
```

### Query Params

| Param | Tipo | Requerido | Descripción |
| ----- | ---- | --------- | ----------- |

### Response 201

```json
{
  "data": {
    "id": "uuid-order-1",
    "client_id": "uuid-user-1",
    "operator_id": null,
    "service_type_id": "uuid-service-1",
    "material_id": "uuid-material-1",
    "status": "BUDGETED",
    "payment_condition": "ADVANCE_50",
    "estimated_price": "125.00",
    "advance_amount": "62.50",
    "budget_expires_at": "2026-05-14T12:00:00.000Z",
    "estimated_delivery_at": "2026-05-16T12:00:00.000Z",
    "notes": "Cortar piezas",
    "created_at": "2026-05-13T12:00:00.000Z",
    "updated_at": "2026-05-13T12:00:00.000Z",
    "service_type": { "id": "uuid-service-1", "name": "Corte Láser", "pricing_model": "PER_UNIT" },
    "material": { "id": "uuid-material-1", "name": "Acrílico 3mm", "unit_price": "12.50", "unit": "m2" }
  }
}
```

### Response 400

```json
{
  "error": true,
  "message": "El tipo de servicio y el material son requeridos"
}
```

### Response 409

```json
{
  "error": true,
  "message": "RN6: Ya tienes un pedido de este tipo en progreso"
}
```

### Response 500

```json
{
  "error": true,
  "message": "Error interno del servidor"
}
```

---

## GET /api/orders/my

### Descripción

Listar pedidos del cliente autenticado (requiere `CLIENT`).

### Request Body

```json
{}
```

### Query Params

| Param | Tipo | Requerido | Descripción |
| ----- | ---- | --------- | ----------- |

### Response 200

```json
{
  "data": [
    {
      "id": "uuid-order-1",
      "service_type": { "id": "uuid-service-1", "name": "Corte Láser" },
      "material": { "id": "uuid-material-1", "name": "Acrílico 3mm" },
      "status": "BUDGETED",
      "estimated_price": "125.00",
      "created_at": "2026-05-13T12:00:00.000Z"
    }
  ]
}
```

### Response 500

```json
{
  "error": true,
  "message": "Error interno del servidor"
}
```

---

## GET /api/orders/:id

### Descripción

Obtener detalle de un pedido del cliente autenticado.

### Request Body

```json
{}
```

### Query Params

| Param | Tipo | Requerido | Descripción |
| ----- | ---- | --------- | ----------- |

### Response 200

```json
{
  "data": {
    "id": "uuid-order-1",
    "service_type": { "id": "uuid-service-1", "name": "Corte Láser" },
    "material": { "id": "uuid-material-1", "name": "Acrílico 3mm" },
    "files": [
      { "id": "uuid-file-1", "order_id": "uuid-order-1", "file_url": "/uploads/file-123.pdf", "file_type": "PLAN_PDF", "uploaded_at": "2026-05-13T12:05:00.000Z" }
    ],
    "payments": []
  }
}
```

### Response 404

```json
{
  "error": true,
  "message": "Pedido no encontrado"
}
```

### Response 500

```json
{
  "error": true,
  "message": "Error interno del servidor"
}
```

---

## POST /api/orders/:id/files

### Descripción

Subir un archivo (plan) para un pedido. Field name: `file`. Acepta `.dwg`, `.dxf`, `.pdf`. (Requiere `CLIENT`).

### Request Body

```json
{}
```

### Query Params

| Param | Tipo | Requerido | Descripción |
| ----- | ---- | --------- | ----------- |

### Response 201

```json
{
  "data": {
    "id": "uuid-file-1",
    "order_id": "uuid-order-1",
    "file_url": "/uploads/file-123.pdf",
    "file_type": "PLAN_PDF",
    "uploaded_at": "2026-05-13T12:05:00.000Z"
  }
}
```

### Response 400

```json
{
  "error": true,
  "message": "No se ha subido ningún archivo"
}
```

### Response 413

```json
{
  "error": true,
  "message": "El archivo excede el tamaño máximo permitido de 20MB"
}
```

### Response 500

```json
{
  "error": true,
  "message": "Error interno del servidor"
}
```

---

## POST /api/orders/:id/confirm

### Descripción

Confirmar presupuesto de un pedido (requiere `CLIENT`). Cambia estado según `payment_condition`.

### Request Body

```json
{}
```

### Query Params

| Param | Tipo | Requerido | Descripción |
| ----- | ---- | --------- | ----------- |

### Response 200

```json
{
  "data": {
    "id": "uuid-order-1",
    "status": "PENDING_PAYMENT",
    "updated_at": "2026-05-13T12:10:00.000Z"
  }
}
```

### Response 400

```json
{
  "error": true,
  "message": "No se puede confirmar un pedido en estado <ESTADO>"
}
```

### Response 404

```json
{
  "error": true,
  "message": "Pedido no encontrado"
}
```

---

## GET /api/operator/orders

### Descripción

Listar pedidos asignados al operario autenticado (requiere `OPERATOR`).

### Request Body

```json
{}
```

### Response 200

```json
{
  "data": [
    {
      "id": "uuid-order-2",
      "client_id": "uuid-user-2",
      "operator_id": "uuid-operator-1",
      "service_type_id": "uuid-service-1",
      "material_id": "uuid-material-1",
      "status": "IN_PROGRESS",
      "payment_condition": "ADVANCE_50",
      "budget_expires_at": "2026-05-14T12:00:00.000Z",
      "estimated_delivery_at": "2026-05-16T12:00:00.000Z",
      "created_at": "2026-05-13T12:00:00.000Z",
      "updated_at": "2026-05-13T12:00:00.000Z",
      "notes": "",
      "operator_notes": null,
      "service_type": { "id": "uuid-service-1", "name": "Corte Láser", "pricing_model": "PER_UNIT", "required_specialty": "LASER" },
      "material": { "id": "uuid-material-1", "name": "Acrílico 3mm", "unit": "m2" },
      "client": { "id": "uuid-user-2", "first_name": "Ana", "last_name": "Lopez", "dni": "87654321", "phone": "912345678" },
      "files": [ { "id": "uuid-file-1", "order_id": "uuid-order-2", "file_type": "PLAN_PDF", "uploaded_at": "2026-05-13T12:05:00.000Z", "download_url": "/api/operator/orders/uuid-order-2/files/uuid-file-1/download" } ]
    }
  ]
}
```

### Response 401

```json
{
  "error": true,
  "message": "Acceso no autorizado, token no proporcionado"
}
```

---

## GET /api/operator/orders/:id

### Descripción

Obtener detalle de un pedido asignado al operario (requiere `OPERATOR`).

### Request Body

```json
{}
```

### Response 200

```json
{
  "data": {
    "id": "uuid-order-2",
    "service_type": { "id": "uuid-service-1", "name": "Corte Láser" },
    "material": { "id": "uuid-material-1", "name": "Acrílico 3mm" },
    "files": [
      { "id": "uuid-file-1", "order_id": "uuid-order-2", "file_url": "/uploads/file-123.pdf", "file_type": "PLAN_PDF", "uploaded_at": "2026-05-13T12:05:00.000Z", "download_url": "/api/operator/orders/uuid-order-2/files/uuid-file-1/download" }
    ]
  }
}
```

### Response 404

```json
{
  "error": true,
  "message": "Pedido no encontrado o no asignado a este operario"
}
```

---

## GET /api/operator/orders/:id/files/:fileId/download

### Descripción

Descargar archivo de un pedido asignado (requiere `OPERATOR`). Respuesta es un stream de archivo.

### Request Body

```json
{}
```

### Response 200

```json
{
  "message": "Archivo enviado como attachment (binary stream)."
}
```

> Nota: el endpoint usa `res.download(...)` y devuelve un stream binario con cabecera `Content-Disposition: attachment; filename="..."`.

### Response 400

```json
{
  "error": true,
  "message": "Ruta de archivo inválida"
}
```

### Response 404

```json
{
  "error": true,
  "message": "Archivo no encontrado"
}
```

---

## PATCH /api/operator/orders/:id/status

### Descripción

Marcar un pedido como `READY` (requiere `OPERATOR`). Sólo se permite cambiar a `READY` desde `IN_PROGRESS`.

### Request Body

```json
{
  "status": "READY"
}
```

### Query Params

| Param | Tipo | Requerido | Descripción |
| ----- | ---- | --------- | ----------- |

### Response 200

```json
{
  "data": {
    "id": "uuid-order-2",
    "status": "READY",
    "updated_at": "2026-05-13T13:00:00.000Z"
  }
}
```

### Response 400

```json
{
  "error": true,
  "message": "Estado inválido. Solo puedes marcar el pedido como READY"
}
```

### Response 403

```json
{
  "error": true,
  "message": "No puedes cambiar el estado de un pedido que no te fue asignado"
}
```

---

## PATCH /api/operator/orders/:id/notes

### Descripción

Actualizar las notas del operario en un pedido (requiere `OPERATOR`).

### Request Body

```json
{
  "notes": "Se requiere pulido final"
}
```

### Response 200

```json
{
  "data": {
    "id": "uuid-order-2",
    "operator_notes": "Se requiere pulido final",
    "updated_at": "2026-05-13T13:05:00.000Z"
  }
}
```

### Response 400

```json
{
  "error": true,
  "message": "El campo notes es requerido"
}
```

### Response 403

```json
{
  "error": true,
  "message": "No puedes agregar notas a un pedido que no te fue asignado"
}
```

---

## POST /api/payments

### Descripción

Registrar un pago (requiere `CLIENT`). Field para la imagen: `capture` (jpg/jpeg/png).

### Request Body

```json
{
  "order_id": "uuid-order-1"
}
```

### Query Params

| Param | Tipo | Requerido | Descripción |
| ----- | ---- | --------- | ----------- |

### Response 201

```json
{
  "data": {
    "id": "uuid-payment-1",
    "order_id": "uuid-order-1",
    "amount": "62.50",
    "payment_type": "ADVANCE",
    "capture_url": "/uploads/capture-123.jpg",
    "status": "PENDING",
    "admin_comment": null,
    "created_at": "2026-05-13T12:30:00.000Z",
    "reviewed_at": null
  }
}
```

### Response 400

```json
{
  "error": true,
  "message": "El order_id es requerido"
}
```

### Response 401

```json
{
  "error": true,
  "message": "Acceso no autorizado, token no proporcionado"
}
```

### Response 409

```json
{
  "error": true,
  "message": "Ya existe una captura pendiente de revisión para este pedido"
}
```

---

## GET /api/admin/payments/pending

### Descripción

Listar pagos pendientes para revisión (requiere `ADMIN`).

### Request Body

```json
{}
```

### Response 200

```json
{
  "data": [
    {
      "id": "uuid-payment-1",
      "order_id": "uuid-order-1",
      "amount": "62.50",
      "payment_type": "ADVANCE",
      "capture_url": "/uploads/capture-123.jpg",
      "status": "PENDING",
      "created_at": "2026-05-13T12:30:00.000Z",
      "order": {
        "id": "uuid-order-1",
        "client": { "id": "uuid-user-1", "first_name": "Juan", "last_name": "Perez", "dni": "12345678", "phone": "987654321" },
        "service_type": { "id": "uuid-service-1", "name": "Corte Láser" }
      }
    }
  ],
  "total": 1
}
```

---

## PATCH /api/admin/payments/:id/approve

### Descripción

Aprobar un pago pendiente (requiere `ADMIN`).

### Request Body

```json
{}
```

### Response 200

```json
{
  "data": {
    "id": "uuid-payment-1",
    "status": "APPROVED",
    "reviewed_at": "2026-05-13T13:00:00.000Z"
  }
}
```

### Response 400

```json
{
  "error": true,
  "message": "El pago no está pendiente de revisión"
}
```

### Response 404

```json
{
  "error": true,
  "message": "Pago no encontrado"
}
```

---

## PATCH /api/admin/payments/:id/reject

### Descripción

Rechazar un pago (requiere `ADMIN`). Body: `admin_comment`.

### Request Body

```json
{
  "admin_comment": "La captura no muestra el comprobante completo"
}
```

### Response 200

```json
{
  "data": {
    "id": "uuid-payment-1",
    "status": "REJECTED",
    "admin_comment": "La captura no muestra el comprobante completo",
    "reviewed_at": "2026-05-13T13:05:00.000Z"
  }
}
```

### Response 400

```json
{
  "error": true,
  "message": "El comentario de rechazo es obligatorio"
}
```

### Response 404

```json
{
  "error": true,
  "message": "Pago no encontrado"
}
```

---

## PATCH /api/admin/orders/:id/assign

### Descripción

Asignar un operario a un pedido (requiere `ADMIN`). Body: `operator_id`.

### Request Body

```json
{
  "operator_id": "uuid-operator-1"
}
```

### Response 200

```json
{
  "data": {
    "id": "uuid-order-3",
    "operator_id": "uuid-operator-1"
  }
}
```

### Response 400

```json
{
  "error": true,
  "message": "El ID del operario es requerido"
}
```

### Response 404

```json
{
  "error": true,
  "message": "Pedido no encontrado"
}
```

---

## GET /api/admin/stats/sales

### Descripción

Estadísticas de ventas. Query params: `startDate`, `endDate`, `range` (`today|week|month`).

### Request Body

```json
{}
```

### Query Params

| Param | Tipo | Requerido | Descripción |
| ----- | ---- | --------- | ----------- |
| startDate | string | no | Fecha ISO inicio |
| endDate | string | no | Fecha ISO fin |
| range | string | no | `today`, `week` o `month` |

### Response 200

```json
{
  "data": {
    "totalSales": 125.5,
    "advanceSales": 62.5,
    "finalSales": 63.0,
    "totalPayments": 2,
    "dailySales": [ { "date": "2026-05-13", "total": 125.5 } ]
  }
}
```

### Response 400

```json
{
  "error": true,
  "message": "startDate inválido"
}
```

---

## GET /api/admin/stats/services

### Descripción

Estadísticas por servicio (contador de pedidos por servicio).

### Response 200

```json
{
  "data": [
    { "service_id": "uuid-service-1", "service_name": "Corte Láser", "count": 10 }
  ],
  "total": 1
}
```

---

## GET /api/admin/stats/clients

### Descripción

Top clientes por pedidos entregados.

### Response 200

```json
{
  "data": [
    {
      "client_id": "uuid-user-2",
      "first_name": "Ana",
      "last_name": "Lopez",
      "dni": "87654321",
      "phone": "912345678",
      "delivered_orders_count": 5,
      "registered_completed_orders_count": 5,
      "is_frequent": true
    }
  ],
  "total": 1
}
```

---

## GET /api/admin/stats/operators

### Descripción

Estadísticas por operario.

### Response 200

```json
{
  "data": [
    {
      "operator_id": "uuid-operator-1",
      "first_name": "Luis",
      "last_name": "Gomez",
      "specialties": ["LASER"],
      "orders_attended": 12,
      "average_time_hours": 24.5
    }
  ],
  "total": 1
}
```

---

## GET /api/admin/stats/orders-by-status

### Descripción

Contador de pedidos por estado.

### Response 200

```json
{
  "data": [ { "status": "IN_PROGRESS", "count": 5 } ],
  "total": 1
}
```

---

## GET /api/admin/orders

### Descripción

Listar pedidos para admin. Query params: `status`, `startDate`, `endDate`.

### Response 200

```json
{
  "data": [],
  "total": 0
}
```

---

## GET /api/admin/reports/orders/export

### Descripción

Exportar reporte de pedidos en Excel. Devuelve `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (binary).

### Response 200

```json
{
  "message": "XLSX binary stream (attachment)."
}
```

---

## GET /api/admin/clients

### Descripción

Listar clientes.

### Response 200

```json
{
  "data": [],
  "total": 0
}
```

---

## PATCH /api/admin/clients/:id/frequent

### Descripción

Marcar cliente como frecuente (requiere `ADMIN`). Body: `is_frequent` boolean (por defecto true si no se envía).

### Request Body

```json
{
  "is_frequent": true
}
```

### Response 200

```json
{
  "data": {
    "id": "uuid-user-1",
    "first_name": "Juan",
    "last_name": "Perez",
    "dni": "12345678",
    "phone": "987654321",
    "completed_orders_count": 3,
    "is_frequent": true
  }
}
```

### Response 404

```json
{
  "error": true,
  "message": "Cliente no encontrado"
}
```

---

## POST /api/admin/operators

### Descripción

Crear un operario (requiere `ADMIN`). `specialties` puede ser array o cadena separada por comas.

### Request Body

```json
{
  "dni": "23456789",
  "first_name": "Carlos",
  "last_name": "Diaz",
  "phone": "945678123",
  "password": "opPass123",
  "specialties": ["LASER"]
}
```

### Response 201

```json
{
  "data": {
    "id": "uuid-operator-1",
    "user": {
      "id": "uuid-user-op",
      "dni": "23456789",
      "first_name": "Carlos",
      "last_name": "Diaz",
      "phone": "945678123",
      "role": "OPERATOR"
    },
    "specialties": [ { "id": "uuid-spec-1", "specialty": "LASER" } ]
  }
}
```

### Response 400

```json
{
  "error": true,
  "message": "Debe asignar al menos una especialidad al operario"
}
```

### Response 409

```json
{
  "error": true,
  "message": "DNI ya registrado"
}
```

---

## PATCH /api/admin/operators/:id

### Descripción

Actualizar operario (requiere `ADMIN`).

### Request Body

```json
{
  "first_name": "Carlos",
  "specialties": ["LASER","PLOTTING"]
}
```

### Response 200

```json
{
  "data": {
    "id": "uuid-operator-1",
    "user": { "id": "uuid-user-op", "dni": "23456789", "first_name": "Carlos", "phone": "945678123" },
    "specialties": [ { "specialty": "LASER" }, { "specialty": "PLOTTING" } ]
  }
}
```

### Response 404

```json
{
  "error": true,
  "message": "Operario no encontrado"
}
```

---

## DELETE /api/admin/operators/:id

### Descripción

Eliminar operario (requiere `ADMIN`).

### Response 200

```json
{
  "data": { "deleted": true }
}
```

### Response 409

```json
{
  "error": true,
  "message": "No se puede eliminar un operario con pedidos activos en progreso"
}
```

---

**Fin del contrato.**
