# CHATBOT.md — SIGEPED
## Integración Bot WhatsApp · Twilio + ngrok · Localhost

---

## 1. ALCANCE EXACTO DEL BOT

Este bot NO es un chatbot de IA. Es un sistema de mensajería estructurada
que cumple tres funciones concretas:

| Función | Descripción |
|---------|-------------|
| **Bienvenida** | Mensaje automático cuando un cliente se registra por primera vez |
| **Presentación** | Menú inicial explicando las opciones de la plataforma |
| **Notificaciones de estado** | Aviso automático cuando el pedido cambia de estado |

El usuario responde únicamente con:
- **1** → Confirmación / De acuerdo / Sí
- **0** → No / Cancelar / No por ahora

Nada más. El bot no interpreta lenguaje natural.

---

## 2. STACK DEL BOT

| Componente | Tecnología | Notas |
|------------|------------|-------|
| Mensajería | Twilio WhatsApp Sandbox | Número de prueba gratuito |
| Tunnel | ngrok | Expone localhost al webhook de Twilio |
| Backend | Módulo nuevo en el backend Express existente | No proyecto separado |
| Trigger | Eventos internos del sistema (registro, cambio de estado) | |

> El bot vive en `backend/src/modules/notifications/` — el módulo
> que ya está definido en PROJECT.md. Solo se añade la lógica del webhook.

---

## 3. FLUJOS DEL BOT

### 3.1 Bienvenida — cliente nuevo

**Trigger:** `POST /api/auth/register` exitoso

**Mensaje que envía el bot:**
```
Hola [Nombre] 👋 Bienvenido a SIGEPED — ESIAD Proyectos.

Somos tu plataforma de gestión de pedidos para:
  • Corte láser
  • Ploteo
  • Impresión 3D
  • Maquetas

Tus pedidos, presupuestos y notificaciones los gestionas
desde: [URL del sistema]

Responde *1* para confirmar que recibiste este mensaje.
```

**Respuesta del usuario:**
- `1` → Bot responde: "Perfecto. Te avisaremos aquí cada vez que tu pedido avance. ✅"
- `0` o cualquier otra cosa → Bot responde: "Sin problema. Puedes escribirnos cuando lo necesites."

---

### 3.2 Notificaciones de estado de pedido

**Trigger:** Cambio de estado en la tabla `orders`

| Estado nuevo | Mensaje enviado |
|---|---|
| `PENDING_PAYMENT` | "Tu presupuesto para el pedido #[ID] está listo. Monto: S/ [X]. Ingresa a la plataforma para realizar tu pago. Responde *1* si ya lo viste." |
| `IN_PROGRESS` | "✅ Tu pago fue confirmado. El pedido #[ID] está en producción. Te avisamos cuando esté listo." |
| `READY` | "🎉 Tu pedido #[ID] está listo para recoger en tienda. Recuerda traer tu DNI. Responde *1* para confirmar que lo viste." |
| `CANCELLED` | "Tu pedido #[ID] fue cancelado. Escribe al asesor si tienes dudas." |

**Respuesta del usuario a cualquier notificación:**
- `1` → Bot responde: "Gracias por confirmar. ✅"
- `0` → Bot responde: "Entendido. Si necesitas ayuda escríbenos."

---

### 3.3 Recordatorio 48h sin recojo

**Trigger:** Job programado — pedido en estado `READY` por más de 48h

**Mensaje:**
```
Recordatorio: Tu pedido #[ID] lleva más de 48 horas
listo para recoger en tienda.

Recógelo pronto para liberar tu lugar en cola.
Responde *1* si vas a recogerlo hoy.
```

**Respuesta:**
- `1` → "Te esperamos. Trae tu DNI. 👍"
- `0` → "Entendido. Si necesitas reprogramar escríbenos."

---

## 4. ARQUITECTURA EN EL BACKEND

```
backend/src/
├── modules/
│   └── notifications/
│       ├── notifications.routes.ts      ← EXISTENTE: agregar ruta /webhook
│       ├── notifications.controller.ts  ← EXISTENTE: agregar método handleWebhook
│       ├── notifications.service.ts     ← EXISTENTE: agregar sendWhatsApp()
│       └── bot.service.ts               ← NUEVO: lógica de respuestas del bot
├── jobs/
│   └── pickup-reminder.job.ts           ← EXISTENTE: ya dispara notificación
```

Solo se crean o modifican estos 2 archivos:
- `notifications.service.ts` → agregar función `sendWhatsApp()`
- `bot.service.ts` → nuevo, maneja las respuestas 1/0

---

## 5. PROMPT PARA CURSOR

Pega esto en Cursor para implementar el bot:

```
Estamos en el Sprint 7 — Notificaciones de SIGEPED.
Lee PROJECT.md, DATABASE.md y SPRINTS.md antes de continuar.

TAREA: Integrar bot de WhatsApp simple usando Twilio + ngrok
en el backend Express existente. El bot NO es IA — solo responde
a mensajes 1 y 0 del usuario.

El bot tiene 3 funciones:
1. Enviar mensaje de bienvenida cuando un cliente se registra
2. Enviar notificaciones automáticas cuando cambia el estado de un pedido
3. Responder "Gracias por confirmar ✅" si el usuario responde 1,
   y "Entendido" si responde 0. Cualquier otro texto: ignorar.

─────────────────────────────────────────────────────────────
PASO 1 — Instalar dependencias
─────────────────────────────────────────────────────────────

En backend/, ejecuta:
npm install twilio node-cron

Agrega estas variables al .env y .env.example:

TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
NGROK_URL=https://xxxx-xxxx-xxxx.ngrok-free.app

─────────────────────────────────────────────────────────────
PASO 2 — Modificar notifications.service.ts
─────────────────────────────────────────────────────────────

Agrega la función sendWhatsApp() al servicio existente:

import twilio from 'twilio';
import { prisma } from '../../prisma/client';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendWhatsApp(
  toPhone: string,
  message: string,
  orderId?: string,
  userId?: string,
  triggerEvent?: string
): Promise<void> {
  try {
    const msg = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM!,
      to: `whatsapp:+51${toPhone}`,
      body: message
    });

    if (orderId && userId && triggerEvent) {
      await prisma.notification.create({
        data: {
          order_id: orderId,
          user_id: userId,
          trigger_event: triggerEvent as any,
          whatsapp_message_id: msg.sid,
          delivery_status: 'SENT'
        }
      });
    }
  } catch (error) {
    console.error('Twilio error:', error);
    if (orderId && userId && triggerEvent) {
      await prisma.notification.create({
        data: {
          order_id: orderId,
          user_id: userId,
          trigger_event: triggerEvent as any,
          whatsapp_message_id: null,
          delivery_status: 'FAILED'
        }
      });
    }
  }
}

─────────────────────────────────────────────────────────────
PASO 3 — Crear bot.service.ts (NUEVO archivo)
─────────────────────────────────────────────────────────────

Crea backend/src/modules/notifications/bot.service.ts:

El archivo debe exportar una sola función:
handleIncomingMessage(from: string, body: string): Promise<string>

Lógica:
- Limpiar el body: body.trim()
- Si body === '1': retornar "Gracias por confirmar. ✅"
- Si body === '0': retornar "Entendido. Si necesitas ayuda escríbenos."
- Cualquier otro valor: retornar "" (string vacío — no responder)

La función NO accede a BD. Es pura lógica de string.

─────────────────────────────────────────────────────────────
PASO 4 — Agregar webhook en notifications.routes.ts
─────────────────────────────────────────────────────────────

Agrega esta ruta al router existente:

POST /api/notifications/webhook

Esta ruta:
- NO requiere autenticación JWT (Twilio llama directamente)
- Recibe body de Twilio: { From: string, Body: string }
- Extrae el número limpio: From.replace('whatsapp:+51', '')
- Llama a handleIncomingMessage(from, body)
- Si la respuesta no es vacía, responde con TwiML:

import twilio from 'twilio';
const twiml = new twilio.twiml.MessagingResponse();
twiml.message(respuesta);
res.type('text/xml');
res.send(twiml.toString());

- Si la respuesta es vacía (mensaje no reconocido): res.sendStatus(204)

─────────────────────────────────────────────────────────────
PASO 5 — Integrar sendWhatsApp() en los puntos del flujo
─────────────────────────────────────────────────────────────

Modifica estos archivos existentes para llamar a sendWhatsApp():

A) auth.service.ts — función register():
   Después de crear el usuario exitosamente, llama sendWhatsApp()
   con el mensaje de bienvenida. orderId = undefined (no hay pedido aún).
   Mensaje:
   "Hola [nombre] 👋 Bienvenido a SIGEPED — ESIAD Proyectos.\n
   Gestiona tus pedidos de corte láser, ploteo, impresión 3D y maquetas
   desde nuestra plataforma.\n
   Responde *1* para confirmar que recibiste este mensaje."

B) payments.service.ts — función approvePayment():
   Después de cambiar order.status a IN_PROGRESS, llama sendWhatsApp()
   con el mensaje de pago confirmado.
   triggerEvent: 'PAYMENT_CONFIRMED'
   Mensaje:
   "✅ Tu pago fue confirmado. El pedido #[order.id.slice(0,8)] 
   está en producción. Te avisamos cuando esté listo."

C) operators.service.ts — función updateOrderStatus() cuando status = READY:
   Llama sendWhatsApp() con el mensaje de pedido listo.
   triggerEvent: 'ORDER_READY'
   Mensaje:
   "🎉 Tu pedido #[order.id.slice(0,8)] está listo para recoger
   en tienda. Recuerda traer tu DNI.\n
   Responde *1* para confirmar que lo viste."

D) jobs/pickup-reminder.job.ts — job existente:
   Llama sendWhatsApp() para cada pedido READY con +48h.
   triggerEvent: 'PICKUP_REMINDER_48H'
   Mensaje:
   "Recordatorio: Tu pedido #[order.id.slice(0,8)] lleva más de
   48 horas listo en tienda.\n
   Responde *1* si vas a recogerlo hoy."

─────────────────────────────────────────────────────────────
PASO 6 — Registrar la ruta del webhook en app.ts
─────────────────────────────────────────────────────────────

En app.ts, asegúrate de que la ruta del webhook se registre
ANTES del middleware de autenticación global:

app.use('/api/notifications', notificationsRouter);

Si el middleware de auth es global, excluir la ruta del webhook:
app.use((req, res, next) => {
  if (req.path === '/api/notifications/webhook') return next();
  return authMiddleware(req, res, next);
});

─────────────────────────────────────────────────────────────
RESTRICCIONES IMPORTANTES:
─────────────────────────────────────────────────────────────
- NO uses express.json() en la ruta del webhook — Twilio envía
  application/x-www-form-urlencoded. Usa express.urlencoded().
- NO valides JWT en la ruta /webhook.
- Si TWILIO_ACCOUNT_SID no está en .env, el sendWhatsApp() debe
  fallar silenciosamente (try/catch) y guardar FAILED en BD.
- NO respondas a mensajes que no sean "1" o "0".
- El número del usuario en BD está sin prefijo (+51).
  Twilio envía "whatsapp:+51XXXXXXXXX" — limpiar antes de comparar.

Al terminar dime qué ítems del DoD del Sprint 7 quedan cubiertos.
```

---

## 6. CONFIGURAR TWILIO SANDBOX (paso a paso)

### 6.1 Crear cuenta Twilio
1. Ir a https://www.twilio.com/try-twilio
2. Registrarse con email (cuenta gratuita)
3. Verificar tu número de celular personal

### 6.2 Activar WhatsApp Sandbox
1. En el dashboard de Twilio ir a:
   **Messaging → Try it out → Send a WhatsApp message**
2. Verás el número de sandbox: `+1 415 523 8886`
3. Desde tu WhatsApp personal envía el código que te indican:
   `join [palabra-palabra]`
4. Recibirás confirmación de que estás en el sandbox
5. Desde ese momento ese número puede recibir y enviar mensajes a tu celular

### 6.3 Configurar ngrok
```bash
# Instalar ngrok
npm install -g ngrok

# O descargarlo de https://ngrok.com/download

# Autenticarse (crear cuenta gratuita en ngrok.com)
ngrok config add-authtoken TU_TOKEN_AQUI

# Exponer el puerto del backend
ngrok http 3000
```

Ngrok te dará una URL como:
`https://a1b2-123-456-789.ngrok-free.app`

### 6.4 Configurar webhook en Twilio
1. En Twilio ir a: **Messaging → Try it out → Send a WhatsApp message**
2. En el campo **"When a message comes in"** pegar:
   `https://a1b2-123-456-789.ngrok-free.app/api/notifications/webhook`
3. Método: **HTTP POST**
4. Guardar

### 6.5 Actualizar .env
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
NGROK_URL=https://a1b2-123-456-789.ngrok-free.app
```

> ⚠️ La URL de ngrok cambia cada vez que reinicias ngrok en la cuenta
> gratuita. Actualiza el webhook en Twilio y el .env cada vez.

---

## 7. CÓMO PROBAR EL BOT

### Prueba 1 — Bienvenida
1. Levantar backend: `npm run dev`
2. Levantar ngrok: `ngrok http 3000`
3. Registrar un cliente nuevo desde el frontend
4. El celular del cliente debe recibir el mensaje de bienvenida en WhatsApp
5. Responder `1` → verificar que llega "Gracias por confirmar. ✅"
6. Verificar en Prisma Studio que se creó registro en tabla `notifications`

### Prueba 2 — Notificación de pedido listo
1. Como admin, aprobar un pago y asignar operario
2. Como operario, marcar el pedido como READY
3. El cliente debe recibir notificación en WhatsApp
4. Responder `1` → verificar respuesta del bot

### Prueba 3 — Webhook directo (sin frontend)
```bash
curl -X POST http://localhost:3000/api/notifications/webhook \
  -d "From=whatsapp:+51987654321&Body=1"
```
Debe retornar XML con el mensaje de confirmación.

### Prueba 4 — Fallback sin Twilio
1. Vaciar TWILIO_ACCOUNT_SID en .env
2. Registrar un cliente
3. Verificar que el backend NO crashea
4. Verificar en BD que el registro tiene delivery_status = FAILED

---

## 8. LIMITACIONES DEL SANDBOX

| Limitación | Detalle |
|------------|---------|
| Números autorizados | Solo pueden recibir mensajes los celulares que enviaron el código `join` |
| Tiempo de sesión | El sandbox expira si no hay actividad en 72h — reenviar el código |
| Sin templates | El sandbox no requiere templates aprobados por Meta |
| Solo localhost | No hay dominio productivo — ngrok es suficiente para la demo |

---

## 9. CHECKLIST DE ENTREGA — SPRINT 7

- [ ] `sendWhatsApp()` implementado en notifications.service.ts
- [ ] `bot.service.ts` creado con lógica 1/0
- [ ] Webhook `POST /api/notifications/webhook` funcional
- [ ] Bienvenida enviada al registrar cliente nuevo
- [ ] Notificación enviada al aprobar pago (PAYMENT_CONFIRMED)
- [ ] Notificación enviada al marcar pedido como READY (ORDER_READY)
- [ ] Recordatorio enviado por job a pedidos READY +48h (PICKUP_REMINDER_48H)
- [ ] Respuesta `1` → "Gracias por confirmar ✅"
- [ ] Respuesta `0` → "Entendido"
- [ ] Mensaje no reconocido → sin respuesta (204)
- [ ] Si Twilio falla → delivery_status = FAILED en BD, sin crash
- [ ] Campana de notificaciones en navbar muestra contador
- [ ] Prueba con curl al webhook retorna TwiML válido
- [ ] .env.example actualizado con las 4 variables de Twilio/ngrok
EOF
echo "Done"