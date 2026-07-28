-- Notificacion cuando el operario confirma el pago del saldo restante (50%)
-- de un pedido que ya esta READY (no cambia el estado del pedido).
ALTER TYPE "TriggerEvent" ADD VALUE IF NOT EXISTS 'BALANCE_PAYMENT_CONFIRMED';
