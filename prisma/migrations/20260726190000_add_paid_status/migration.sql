-- Estado intermedio "pagado": el operario verifica el comprobante y confirma
-- el pago (PENDING_PAYMENT -> PAID) antes de iniciar producción (PAID ->
-- IN_PROGRESS). Permite ordenar por separado la cola de "pagos por
-- verificar" y la cola de "pagados, por iniciar producción".
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAID' BEFORE 'IN_PROGRESS';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "payment_confirmed_at" TIMESTAMP(3);
