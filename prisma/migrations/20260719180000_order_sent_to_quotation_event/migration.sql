-- Nuevo evento para la notificación in-app al operario cuando el cliente
-- envía un borrador a cotización (POST /api/orders/:id/send-to-quotation).
-- Ninguno de los TriggerEvent existentes representa este caso: todos asumen
-- al cliente como destinatario.
ALTER TYPE "TriggerEvent" ADD VALUE IF NOT EXISTS 'ORDER_SENT_TO_QUOTATION';
