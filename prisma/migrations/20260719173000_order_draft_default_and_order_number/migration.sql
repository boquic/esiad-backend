-- DRAFT ya es el estado inicial editable del pedido (el valor ya existía en el
-- enum desde la migración add_order_draft_status). El default de la columna
-- pasa de BUDGETED a DRAFT: BUDGETED queda como estado legado, alcanzado solo
-- por transición (submitDraft), no como valor inicial.
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- material_id ahora es opcional: el pedido puede nacer sin material asignado
-- (lo define/ajusta el operario más adelante). advance_amount ya era nullable,
-- no requiere cambio.
ALTER TABLE "orders" ALTER COLUMN "material_id" DROP NOT NULL;

-- order_number: correlativo legible (Int autoincremental) para el cliente y
-- el operario, distinto del id (uuid). Alimenta HU-23.
CREATE SEQUENCE "orders_order_number_seq";
ALTER TABLE "orders" ADD COLUMN "order_number" INTEGER NOT NULL DEFAULT nextval('orders_order_number_seq');
ALTER SEQUENCE "orders_order_number_seq" OWNED BY "orders"."order_number";
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");
