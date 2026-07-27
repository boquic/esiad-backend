-- La cola del operario se ordenaba por created_at (creacion del pedido en
-- DRAFT), lo cual no refleja el momento real en que el cliente lo envio a
-- cotizacion (pudo dejarlo como borrador mucho tiempo). queued_at registra
-- ese momento real y no se vuelve a pisar si el pedido regresa a la cola
-- tras un rechazo del operario, para conservar el orden de llegada original.
ALTER TABLE "orders" ADD COLUMN "queued_at" TIMESTAMP(3);

-- Backfill: para pedidos existentes que ya salieron de DRAFT/BUDGETED (es
-- decir, ya fueron enviados a cotizacion en algun momento), se aproxima
-- queued_at con created_at, preservando el orden actual de la cola.
UPDATE "orders"
SET "queued_at" = "created_at"
WHERE "status" NOT IN ('DRAFT', 'BUDGETED');
