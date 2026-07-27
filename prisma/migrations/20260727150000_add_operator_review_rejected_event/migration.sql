-- El operario ahora tiene solo dos acciones al revisar un pedido: Aprobar
-- (fija el precio final y lo manda a CLIENT_REVIEW_PENDING para que el
-- cliente lo confirme) o Rechazar (manda el pedido a CLIENT_REVIEW_PENDING
-- con el motivo, en vez de cancelarlo de inmediato). Este nuevo evento
-- notifica al cliente cuando el operario rechaza/devuelve el pedido.
ALTER TYPE "TriggerEvent" ADD VALUE IF NOT EXISTS 'OPERATOR_REVIEW_REJECTED';
