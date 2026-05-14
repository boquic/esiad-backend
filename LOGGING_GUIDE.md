# Mejora de Logs - Guía de Diagnóstico

## Problema Original: `GET /api/orders/my 304 37.612 ms`

### ¿Qué es un código 304 Not Modified?

El código `304 Not Modified` es una respuesta HTTP que indica que el recurso **no ha cambiado** desde la última solicitud. Express genera esto automáticamente cuando:

1. **ETag activado** (habilitado por defecto en Express): genera un hash del body y lo compara
2. **Headers `If-None-Match`**: el cliente envía el ETag anterior
3. **Si coinciden**: Express devuelve 304 sin enviar el body

### Problema en tu caso

En una API REST dinámica que devuelve datos de base de datos, **esto es incorrecto** porque:
- Los datos pueden haber cambiado entre solicitudes
- El cliente recibe una respuesta vacía (body es `-`)
- Es confuso saber si hubo un error o datos válidos

## Solución Implementada

### 1. **Deshabilitar ETags**
En `src/app.ts`:
```typescript
app.disable('etag');
```

Esto evita que Express genere códigos 304 automáticamente.

### 2. **Logging Mejorado**
Nuevo middleware en `src/middlewares/logging.middleware.ts`:

```bash
GET /api/orders/my 200 45.123ms [USER:abc12345] ✅ 3 items (1245 bytes)
GET /api/admin/payments/pending 401 2.340ms [ANON] ❌ Acceso no autorizado, token no proporcionado
POST /api/orders 500 12.456ms [USER:def67890] ❌ Error interno del servidor
GET /api/services 200 8.234ms [ANON] ✅ 5 items (2048 bytes)
```

### 3. **Información Capturada en Logs**

El nuevo sistema captura:

#### En logs de console.log (formato Morgan mejorado):
- **Método HTTP**: `GET`, `POST`, `PATCH`, etc.
- **Ruta**: `/api/orders/my`
- **Status Code**: `200`, `404`, `500`, etc.
- **Tiempo de respuesta**: `45.123ms`
- **Usuario**: `[USER:id]` o `[ANON]`
- **Detalles de error**: Si status >= 400, muestra el body completo

#### En logs de console.error (solo errores):
```json
{
  "requestId": "1715600400000-abc12def",
  "timestamp": "2026-05-13T12:00:00.000Z",
  "method": "GET",
  "path": "/api/orders/my",
  "userId": "uuid-user-1",
  "statusCode": 500,
  "error": {
    "message": "Cannot read property 'orders' of null",
    "stack": "...",
    "code": "ENOTFOUND"
  },
  "requestBody": { "quantity": 10 },
  "query": { "status": "PENDING" }
}
```

## Cómo Leer los Logs Ahora

### Caso 1: Status 200 OK (Lista de datos)
```
GET /api/orders/my 200 45.123ms [USER:abc12345] ✅ 5 items (2048 bytes)
```
✅ **Éxito**: Se devolvieron 5 pedidos (2048 bytes de JSON)

### Caso 2: Status 200 OK (Objeto único)
```
POST /api/orders 201 35.456ms [USER:abc12345] ✅ OK (512 bytes)
```
✅ **Creado**: Nuevo recurso creado (512 bytes)

### Caso 3: Status 400 Bad Request
```
GET /api/orders/my 400 2.456ms [ANON] ❌ El identificador y la contrasena son requeridos
```
❌ **Error del cliente**: falta validación

### Caso 4: Status 401 Unauthorized
```
GET /api/orders/my 401 1.234ms [ANON] ❌ Acceso no autorizado, token no proporcionado
```
❌ **No autenticado**: token falta o es inválido

### Caso 5: Status 404 Not Found
```
PATCH /api/materials/invalid-id 404 3.120ms [USER:abc12345] ❌ Material no encontrado
```
❌ **Recurso no existe**: verifica el ID

### Caso 6: Status 500 Internal Server Error
En consola verás:
1. **Log de Morgan** (resumen):
   ```
   GET /api/orders/my 500 45.123ms [USER:abc12345] ❌ Error interno del servidor
   ```

2. **Log de console.error** (detalles completos):
   ```json
   {
     "requestId": "1715600400000-abc12def",
     "timestamp": "2026-05-13T12:00:00.000Z",
     "error": {
       "message": "Cannot read property 'id' of undefined",
       "stack": "Error: Cannot read property 'id' of undefined\n    at OrdersService.create (/src/modules/orders/orders.service.ts:15:20)",
       "details": null
     }
   }
   ```

## Testing de los Logs

### 1. **Probar 404 (Material no encontrado)**
```bash
curl -X PATCH http://localhost:3000/api/materials/invalid-id \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'
```

Esperado en logs:
```
PATCH /api/materials/invalid-id 404 5.234ms [USER:abc12345] ❌ Material no encontrado
```

### 2. **Probar 401 (Sin token)**
```bash
curl -X GET http://localhost:3000/api/orders/my
```

Esperado:
```
GET /api/orders/my 401 1.123ms [ANON] ❌ Acceso no autorizado, token no proporcionado
```

### 3. **Probar 200 OK (Con datos)**
```bash
curl -X GET http://localhost:3000/api/services \
  -H "Authorization: Bearer <token>"
```

Esperado:
```
GET /api/services 200 8.234ms [USER:abc12345] ✅ 4 items (2048 bytes)
```

### 4. **Probar 500 (Error de servidor)**
Modifica temporalmente un servicio para lanzar un error:
```typescript
throw new Error('Test error');
```

Esperado en console.error:
```json
{
  "requestId": "...",
  "error": {
    "message": "Test error",
    "stack": "Error: Test error at ...",
    "code": "ERR_UNKNOWN"
  }
}
```

## Ventajas del Nuevo Sistema

✅ **No más 304 Not Modified confusos**
✅ **Ver cantidad de items y bytes en respuestas exitosas**
✅ **Logs estructurados y legibles con emojis**
✅ **Información de usuario y request ID para trazabilidad**
✅ **Stack traces completos en errores**
✅ **Body de request capturado para debugging**
✅ **Omite logs de health check (/health)**
✅ **Compatible con producción**
✅ **Diferenciación clara entre éxito y error**

## Próximos Pasos (Opcional)

1. **Integrar con Winston o Bunyan** para logs persistentes en archivos
2. **Agregar campos adicionales**: IP del cliente, User-Agent
3. **Filtrar información sensible**: passwords, tokens
4. **Enviar logs a servicio de monitoreo**: Sentry, Datadog, etc.
