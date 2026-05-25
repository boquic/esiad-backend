# Levantar chatbot local con Twilio + ngrok

Este proyecto ya tiene implementado el webhook del chatbot en:

`POST /api/notifications/webhook`

La URL local completa es:

`http://localhost:3000/api/notifications/webhook`

## 1. Requisitos previos

- Tener PostgreSQL corriendo y la base de datos accesible desde `DATABASE_URL`.
- Tener el archivo `.env` configurado.
- Tener instalado `ngrok`.

## 2. Variables necesarias en `.env`

Verifica que tu archivo `.env` tenga estas variables:

```env
PORT=3000
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
NGROK_URL=https://tu-subdominio.ngrok-free.app
```

Notas:

- `TWILIO_WHATSAPP_FROM` normalmente es el número del sandbox de Twilio.
- `NGROK_URL` debe actualizarse cada vez que reinicies `ngrok` si usas el plan gratuito.

## 3. Levantar el backend

En PowerShell, desde la raíz del proyecto:

```powershell
npm run dev
```

Si todo está bien, el backend quedará escuchando en:

`http://localhost:3000`

Puedes validar que respondió con:

```powershell
curl http://localhost:3000/health
```

## 4. Levantar ngrok

En una segunda terminal PowerShell:

```powershell
ngrok http 3000
```

`ngrok` te mostrará una URL pública similar a esta:

`https://abcd-1234-5678.ngrok-free.app`

Copia esa URL y actualiza tu `.env`:

```env
NGROK_URL=https://abcd-1234-5678.ngrok-free.app
```

## 5. Configurar webhook en Twilio

En el panel de Twilio WhatsApp Sandbox, configura el webhook de mensajes entrantes con esta URL:

`https://TU-NGROK-URL.ngrok-free.app/api/notifications/webhook`

Ejemplo:

`https://abcd-1234-5678.ngrok-free.app/api/notifications/webhook`

Método esperado:

- `HTTP POST`

## 6. Probar el webhook sin Twilio

Antes de probar desde WhatsApp, puedes validar el endpoint localmente:

```powershell
curl -Method POST http://localhost:3000/api/notifications/webhook `
  -ContentType "application/x-www-form-urlencoded" `
  -Body "From=whatsapp:+51987654321&Body=1"
```

Respuesta esperada:

- XML TwiML con el mensaje `Gracias por confirmar.`

También puedes probar con:

```powershell
curl -Method POST http://localhost:3000/api/notifications/webhook `
  -ContentType "application/x-www-form-urlencoded" `
  -Body "From=whatsapp:+51987654321&Body=0"
```

Respuesta esperada:

- XML TwiML con el mensaje `Entendido. Si necesitas ayuda escríbenos.`

## 7. Probar el flujo desde WhatsApp

1. Asegúrate de haber unido tu número al sandbox de Twilio.
2. Verifica que el backend siga corriendo en `localhost:3000`.
3. Verifica que `ngrok` siga activo.
4. Envía un mensaje al número sandbox de Twilio desde tu WhatsApp.
5. Prueba responder `1` o `0`.

El backend procesará el mensaje en:

`/api/notifications/webhook`

## 8. Qué responde hoy el chatbot

La lógica actual del bot es simple:

- Si el usuario envía `1`, responde: `Gracias por confirmar.`
- Si el usuario envía `0`, responde: `Entendido. Si necesitas ayuda escríbenos.`
- Cualquier otro texto no genera respuesta.

## 9. Errores comunes

## Backend no levanta

Revisa:

- que PostgreSQL esté corriendo
- que `DATABASE_URL` sea válida
- que el puerto `3000` no esté ocupado

## Twilio no llega al webhook

Revisa:

- que `ngrok` siga activo
- que la URL configurada en Twilio sea la actual
- que la ruta termine exactamente en `/api/notifications/webhook`
- que Twilio esté usando `POST`

## El webhook responde local pero no desde WhatsApp

Revisa:

- que tu número esté unido al sandbox de Twilio
- que `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` y `TWILIO_WHATSAPP_FROM` sean correctos

## 10. Secuencia recomendada de arranque

Cada vez que quieras probar el chatbot:

1. Levanta PostgreSQL.
2. Levanta el backend con `npm run dev`.
3. Levanta `ngrok` con `ngrok http 3000`.
4. Actualiza `NGROK_URL` en `.env`.
5. Actualiza el webhook en Twilio con la nueva URL pública.
6. Envía un mensaje de prueba por WhatsApp.
