# Plan de Implementacion: Flujo de Revision de Pedidos

## Objetivo

Ajustar el flujo de pedidos del backend sin reescribir el sistema completo. La meta es agregar una fase real de revision por parte del cliente y del operario, permitir ajuste de presupuesto cuando sea necesario, y cerrar el ciclo con produccion, entrega y confirmacion final.

## Principio de cambio minimo

- No romper los endpoints actuales que ya funcionan.
- Reutilizar el modelo `Order` tanto como sea posible.
- Agregar solo los campos y estados necesarios.
- Mantener compatibilidad con el flujo actual mientras se migra al nuevo.
- Evitar cambios masivos en auth, notificaciones, pagos o admin si no son necesarios.

## Flujo objetivo

1. El cliente crea el pedido.
2. El sistema calcula un presupuesto automatico preliminar.
3. El pedido queda en revision del cliente.
4. El cliente confirma que todo esta correcto o envía observaciones.
5. El operario revisa instrucciones, archivos y presupuesto.
6. El operario puede aprobar, devolver al cliente o ajustar el precio.
7. Cuando ambos estan conformes, el pedido pasa a produccion.
8. El operario registra un tiempo estimado de entrega.
9. El cliente puede adjuntar pagos mientras el pedido esta en produccion.
10. El operario marca el pedido como listo para recoger.
11. El cliente confirma la recepcion.
12. El pedido pasa a `DELIVERED` y el flujo termina.

## Estados propuestos

Se recomienda ampliar el enum `OrderStatus` con estados de revision. La opcion mas simple es esta:

- `BUDGETED`: presupuesto automatico generado, pendiente de revision.
- `CLIENT_REVIEW_PENDING`: el cliente debe validar o observar.
- `OPERATOR_REVIEW_PENDING`: el operario revisa el pedido y puede ajustar el presupuesto.
- `PENDING_PAYMENT`: el pedido esta aprobado, pero espera pago parcial o captura.
- `IN_PROGRESS`: produccion iniciada.
- `READY`: pedido terminado y listo para recoger.
- `DELIVERED`: entrega confirmada por el cliente.
- `EXPIRED`: presupuesto vencido.
- `CANCELLED`: cancelado por alguna razon valida.

Si se quiere reducir complejidad, `CLIENT_REVIEW_PENDING` y `OPERATOR_REVIEW_PENDING` pueden manejarse con un solo estado base y flags adicionales, pero eso hace el flujo menos claro.

## Reglas funcionales

### Cliente

- Debe revisar el pedido antes de que quede firme.
- Puede confirmar que esta correcto.
- Puede enviar observaciones si algo no coincide.
- Debe poder ver el operario asignado al pedido.
- Puede subir pagos cuando el pedido ya esta autorizado para esa etapa.
- Debe confirmar la entrega final para cerrar el pedido.

### Operario

- Debe revisar instrucciones y archivos adjuntos.
- Debe validar si el presupuesto automatico tiene sentido.
- Debe poder ajustar el precio si detecta una diferencia real.
- Debe poder devolver el pedido al cliente para una nueva revision.
- Debe registrar el tiempo estimado de produccion o entrega.
- Debe marcar el pedido como listo para retiro.

### Sistema

- Debe mantener trazabilidad de quien aprobo y quien observo.
- Debe notificar cambios de estado relevantes.
- Debe conservar el historial sin destruir la informacion anterior.

## Cambios de datos sugeridos

Agregar al modelo `Order` algunos campos nuevos para soportar revision y produccion:

- `client_review_notes` o `client_observation`.
- `client_reviewed_at`.
- `operator_reviewed_at`.
- `operator_price_adjustment_reason`.
- `production_time_estimate`.
- `production_started_at`.
- `production_ready_at`.
- `final_price` si se quiere separar el presupuesto automatico del precio final aprobado.

Si se quiere evitar demasiados cambios, se puede reutilizar `notes` y `operator_notes`, pero no es lo ideal para el flujo completo.

## Cambios de backend sugeridos

### 1. OrdersService

- Separar la creacion del pedido de la aprobacion final.
- Crear un metodo para enviar el pedido a revision del cliente.
- Crear un metodo para registrar observaciones del cliente.
- Crear un metodo para que el operario revise y ajuste presupuesto.
- Crear un metodo para aprobar la revision y pasar a produccion.
- Permitir registrar tiempo estimado de produccion.

### 2. OperatorsService

- Agregar un metodo de revision formal del pedido.
- Agregar un metodo para modificar `estimated_price` o `final_price`.
- Agregar un metodo para devolver el pedido al cliente cuando encuentre observaciones.
- Agregar un metodo para fijar tiempo estimado.

### 3. PaymentsService

- Revisar la regla actual de `PENDING_PAYMENT`.
- Definir si los pagos pueden subirse solo en produccion o tambien antes.
- Si se mantiene el flujo actual, no tocar esta parte de mas.

### 4. NotificationsService

- Notificar cuando el cliente envia observaciones.
- Notificar cuando el operario aprueba o ajusta el presupuesto.
- Notificar cuando el pedido pasa a produccion.
- Notificar cuando haya retraso.
- Notificar cuando el pedido este listo para retiro.

### 5. OpenAPI y contratos

- Documentar los nuevos estados.
- Documentar los nuevos endpoints.
- Documentar los nuevos campos de `Order`.
- Documentar las respuestas con operador asignado y datos de revision.

## Endpoints nuevos o ajustados

### Cliente

- `POST /api/orders/:id/confirm-review`
  - Confirma que el pedido esta correcto.
  - Puede mover el pedido al siguiente estado.

- `POST /api/orders/:id/observations`
  - Guarda observaciones del cliente.
  - Devuelve el pedido a revision.

- `POST /api/orders/:id/confirm-pickup`
  - Ya existe.
  - Debe seguir siendo el cierre final.

### Operario

- `POST /api/operator/orders/:id/review`
  - Aprueba, rechaza o devuelve el pedido al cliente.

- `PATCH /api/operator/orders/:id/price`
  - Ajusta el precio estimado o final.

- `PATCH /api/operator/orders/:id/production-time`
  - Registra tiempo estimado de produccion o entrega.

- `PATCH /api/operator/orders/:id/status`
  - Ya existe.
  - Debe seguir marcando `IN_PROGRESS` y `READY`.

## Transiciones sugeridas

| Estado actual | Accion | Nuevo estado |
|---|---|---|
| `BUDGETED` | Cliente confirma | `CLIENT_REVIEW_PENDING` o `OPERATOR_REVIEW_PENDING` segun estrategia |
| `CLIENT_REVIEW_PENDING` | Cliente acepta | `OPERATOR_REVIEW_PENDING` |
| `CLIENT_REVIEW_PENDING` | Cliente observa | `CLIENT_REVIEW_PENDING` o vuelta a `BUDGETED` con observacion |
| `OPERATOR_REVIEW_PENDING` | Operario aprueba | `PENDING_PAYMENT` o `IN_PROGRESS` segun condicion de pago |
| `OPERATOR_REVIEW_PENDING` | Operario ajusta precio | permanece en revision hasta nueva confirmacion |
| `PENDING_PAYMENT` | Pago aprobado | `IN_PROGRESS` |
| `IN_PROGRESS` | Operario termina | `READY` |
| `READY` | Cliente confirma retiro | `DELIVERED` |

## Manejo de observaciones

Las observaciones deben guardarse como texto estructurado o con metadata simple:

- autor de la observacion
- fecha
- mensaje
- tipo de observacion

Si no se quiere crear una nueva tabla, puede usarse un campo JSON o una tabla auxiliar `OrderReviewComment`.

## Notificaciones recomendadas

- Presupuesto listo.
- Pedido enviado a revision.
- Observacion enviada por el cliente.
- Presupuesto ajustado por el operario.
- Pedido aprobado para produccion.
- Pedido en produccion.
- Pedido con retraso.
- Pedido listo para retiro.
- Pedido entregado.

## Riesgos a evitar

- No convertir `notes` en un campo multiproposito sin control.
- No mezclar notas internas del operario con observaciones del cliente.
- No usar solo frontend para validar reglas criticas.
- No cambiar el estado a `DELIVERED` sin confirmacion del cliente.
- No permitir ajustes de precio sin guardar motivo.

## Orden recomendado de implementacion

1. Definir estados y transiciones.
2. Agregar campos nuevos a Prisma.
3. Crear migracion de base de datos.
4. Implementar endpoints de cliente.
5. Implementar endpoints de operario.
6. Ajustar pagos si hace falta.
7. Actualizar notificaciones.
8. Actualizar OpenAPI.
9. Probar el flujo completo.

## Prompt para otra IA

Usa este prompt tal cual si quieres que otra IA implemente el cambio sin alterar por completo el sistema:

```text
Actua sobre el backend existente de ESIAD con cambios minimos y seguros. No reescribas la arquitectura completa ni modifiques auth, rutas o modulos que no esten relacionados con el flujo de pedidos.

Objetivo:
Implementar un flujo de revision de pedidos donde el cliente y el operario validen el pedido antes de la produccion, permitiendo observaciones, ajuste de presupuesto por el operario, registro de tiempo estimado y cierre final con confirmacion del cliente.

Reglas obligatorias:
- Mantener compatibles los endpoints existentes siempre que sea posible.
- No eliminar el flujo actual; extenderlo.
- No romper la creacion de pedidos ni la notificacion de presupuesto.
- No usar notas internas del operario como reemplazo del flujo de revision del cliente.
- No permitir entregar un pedido sin confirmacion final del cliente.
- Guardar observaciones y ajuste de precio con trazabilidad.
- Hacer cambios pequenos, incrementales y validados.

Tareas:
1. Revisar el modelo Prisma de Order y proponer los campos minimos necesarios para soportar revision de cliente, revision de operario, ajuste de precio y tiempo estimado.
2. Agregar o ajustar estados del pedido para incluir revision del cliente y revision del operario sin romper los estados existentes.
3. Crear endpoints para:
   - confirmar revision del cliente,
   - enviar observaciones del cliente,
   - revisar pedido por parte del operario,
   - ajustar presupuesto,
   - registrar tiempo estimado de produccion,
   - mantener la confirmacion de retiro final.
4. Actualizar servicios y controladores solo en los modulos necesarios.
5. Actualizar notificaciones para reflejar observacion, aprobacion, produccion, retraso y entrega.
6. Actualizar OpenAPI y contratos de respuesta.
7. Validar con errores de tipos y pruebas basicas que no se rompa el flujo actual.

Forma de trabajar:
- Empieza revisando el flujo actual de pedidos, pagos, operadores y notificaciones.
- Antes de editar, identifica el cambio minimo necesario.
- Implementa primero el modelo y las transiciones.
- Luego agrega endpoints.
- Finalmente ajusta notificaciones y documentacion.
- Si algo no existe, no lo inventes en frontend: implementalo en backend de forma consistente.

Resultado esperado:
Un backend que soporte revision de pedidos antes de producir, con observaciones del cliente, validacion del operario, ajuste controlado de presupuesto, produccion, pago y confirmacion final de entrega, todo sin rehacer por completo el sistema.
```
