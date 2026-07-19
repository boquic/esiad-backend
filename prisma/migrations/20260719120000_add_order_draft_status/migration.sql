-- Estado borrador: el pedido se crea en DRAFT y el cliente puede editarlo o
-- eliminarlo hasta que lo envía (DRAFT -> BUDGETED).
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DRAFT' BEFORE 'BUDGETED';
