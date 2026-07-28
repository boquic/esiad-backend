-- El operario ahora puede marcar un comprobante subido por el cliente como
-- "pago no recibido" (no confirma el pago, el pedido se queda en
-- PENDING_PAYMENT para que el cliente vuelva a intentar). Este evento
-- notifica al cliente de esa situacion.
ALTER TYPE "TriggerEvent" ADD VALUE IF NOT EXISTS 'PAYMENT_REJECTED';
