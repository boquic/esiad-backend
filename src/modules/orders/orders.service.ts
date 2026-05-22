import { prisma } from '../../config/database';
import { FileType, Prisma, PricingModel } from '@prisma/client';
import { notificationsService } from '../notifications/notifications.service';

function calculateEstimatedDeliveryAt(pricingModel: PricingModel): Date {
  const estimatedDeliveryAt = new Date();

  switch (pricingModel) {
    case 'PER_UNIT':
    case 'PER_M2':
      estimatedDeliveryAt.setDate(estimatedDeliveryAt.getDate() + 2);
      break;
    case 'PER_VOLUME':
    case 'FIXED':
    default:
      estimatedDeliveryAt.setDate(estimatedDeliveryAt.getDate() + 3);
      break;
  }

  return estimatedDeliveryAt;
}

export class OrdersService {
  async create(clientId: string, data: {
    service_type_id: string;
    material_id: string;
    quantity?: number;
    area?: number;
    volume?: number;
    notes?: string;
  }) {
    const { service_type_id, material_id, quantity, area, volume, notes } = data;

    // 1. Validar RN#6: Un cliente no puede tener dos pedidos del mismo tipo de servicio en estado 'IN_PROGRESS' simultáneamente
    const activeOrder = await prisma.order.findFirst({
      where: {
        client_id: clientId,
        service_type_id,
        status: 'IN_PROGRESS',
      },
    });

    if (activeOrder) {
      throw new Error('RN6: Ya tienes un pedido de este tipo en progreso');
    }

    // 2. Obtener Servicio y Material
    const serviceType = await prisma.serviceType.findUnique({
      where: { id: service_type_id },
    });

    if (!serviceType || !serviceType.is_active) {
      throw new Error('Servicio no encontrado o inactivo');
    }

    const material = await prisma.material.findUnique({
      where: { id: material_id },
    });

    if (!material || !material.is_active || material.service_type_id !== service_type_id) {
      throw new Error('Material no encontrado, inactivo o no pertenece al servicio');
    }

    // 3. Calcular Precio Estimado según PricingModel
    let estimatedPrice = new Prisma.Decimal(0);

    switch (serviceType.pricing_model) {
      case 'FIXED':
        estimatedPrice = material.unit_price;
        break;
      case 'PER_M2':
        if (!area) throw new Error('El área es requerida para este servicio');
        estimatedPrice = material.unit_price.mul(area);
        break;
      case 'PER_UNIT':
        if (!quantity) throw new Error('La cantidad es requerida para este servicio');
        estimatedPrice = material.unit_price.mul(quantity);
        break;
      case 'PER_VOLUME':
        if (!volume) throw new Error('El volumen es requerido para este servicio');
        estimatedPrice = material.unit_price.mul(volume);
        break;
      default:
        throw new Error('Modelo de precios no soportado');
    }

    // 4. Determinar Condición de Pago según is_frequent
    const user = await prisma.user.findUnique({
      where: { id: clientId },
      select: { is_frequent: true },
    });

    const payment_condition = user?.is_frequent ? 'CASH_ON_DELIVERY' : 'ADVANCE_50';
    
    // 5. Calcular monto de adelanto si aplica
    const advance_amount = payment_condition === 'ADVANCE_50' ? estimatedPrice.mul(0.5) : null;

    // 6. Fijar expiración del presupuesto (ahora + 24h)
    const budget_expires_at = new Date();
    budget_expires_at.setHours(budget_expires_at.getHours() + 24);
    const estimated_delivery_at = calculateEstimatedDeliveryAt(serviceType.pricing_model);

    // 7. Crear el pedido
    const order = await prisma.order.create({
      data: {
        client_id: clientId,
        service_type_id,
        material_id,
        status: 'BUDGETED',
        payment_condition,
        estimated_price: estimatedPrice,
        advance_amount,
        budget_expires_at,
        estimated_delivery_at,
        notes,
      },
      include: {
        service_type: true,
        material: true,
      },
    });

    await notificationsService.send(order.id, 'BUDGET_READY');

    return order;
  }

  async findByClientId(clientId: string) {
    await prisma.order.updateMany({
      where: {
        client_id: clientId,
        status: 'BUDGETED',
        budget_expires_at: {
          lt: new Date(),
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    const orders = await prisma.order.findMany({
      where: {
        client_id: clientId,
      },
      include: {
        service_type: true,
        material: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return orders.map(({ operator_notes, ...order }) => order);
  }

  async findById(id: string, clientId: string) {
    const order = await prisma.order.findFirst({
      where: {
        id,
        client_id: clientId,
      },
      include: {
        service_type: true,
        material: true,
        files: true,
        payments: true,
      },
    });

    if (!order) {
      return null;
    }

    const { operator_notes, ...safeOrder } = order;
    return safeOrder;
  }

  async addFile(orderId: string, clientId: string, fileData: { file_url: string; file_type: FileType }) {
    // Verificar que el pedido existe y pertenece al cliente
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        client_id: clientId
      }
    });

    if (!order) {
      throw new Error('Pedido no encontrado o no tienes permiso');
    }

    return await prisma.orderFile.create({
      data: {
        order_id: orderId,
        ...fileData
      }
    });
  }

  async confirmBudget(orderId: string, clientId: string) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        client_id: clientId,
      }
    });

    if (!order) {
      throw new Error('Pedido no encontrado');
    }

    if (order.status !== 'BUDGETED') {
      throw new Error(`No se puede confirmar un pedido en estado ${order.status}`);
    }

    if (order.budget_expires_at < new Date()) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'EXPIRED' }
      });

      throw new Error('El presupuesto ha expirado');
    }

    const nextStatus = order.payment_condition === 'CASH_ON_DELIVERY'
      ? 'IN_PROGRESS'
      : 'PENDING_PAYMENT';

    return await prisma.order.update({
      where: { id: orderId },
      data: { status: nextStatus }
    });
  }
}
