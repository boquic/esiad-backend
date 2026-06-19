import { Prisma, PrismaClient, FileType, PricingModel, Specialty } from '@prisma/client';
import path from 'path';
import { ENV } from '../../config/env';
import { NotificationsService } from '../notifications/notifications.service';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError } from '../../utils/errors';

const orderWithOperatorInclude = {
  service_type: true,
  material: true,
  operator: {
    select: {
      id: true,
      user: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          dni: true,
          phone: true
        }
      }
    }
  }
} as const;

import { calculateAdvanceAmount, calculateEstimatedDeliveryAt, mapPricingModelToSpecialty } from '../../utils/order.utils';

export class OrdersService {
  constructor(
    private prisma: PrismaClient,
    private notificationsService: NotificationsService
  ) {}
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
    const activeOrder = await this.prisma.order.findFirst({
      where: {
        client_id: clientId,
        service_type_id,
        status: 'IN_PROGRESS',
      },
    });

    if (activeOrder) {
      throw new ConflictError('RN6: Ya tienes un pedido de este tipo en progreso');
    }

    // 2. Obtener Servicio y Material
    const serviceType = await this.prisma.serviceType.findUnique({
      where: { id: service_type_id },
    });

    if (!serviceType || !serviceType.is_active) {
      throw new NotFoundError('Servicio no encontrado o inactivo');
    }

    const material = await this.prisma.material.findUnique({
      where: { id: material_id },
    });

    if (!material || !material.is_active || material.service_type_id !== service_type_id) {
      throw new BadRequestError('Material no encontrado, inactivo o no pertenece al servicio');
    }

    // 3. Calcular Precio Estimado según PricingModel
    let estimatedPrice = new Prisma.Decimal(0);

    switch (serviceType.pricing_model) {
      case 'FIXED':
        estimatedPrice = material.unit_price;
        break;
      case 'PER_M2':
        if (!area) throw new BadRequestError('El área es requerida para este servicio');
        estimatedPrice = material.unit_price.mul(area);
        break;
      case 'PER_UNIT':
        if (!quantity) throw new BadRequestError('La cantidad es requerida para este servicio');
        estimatedPrice = material.unit_price.mul(quantity);
        break;
      case 'PER_VOLUME':
        if (!volume) throw new BadRequestError('El volumen es requerido para este servicio');
        estimatedPrice = material.unit_price.mul(volume);
        break;
      default:
        throw new BadRequestError('Modelo de precios no soportado');
    }

    // 4. Determinar Condición de Pago según is_frequent
    const user = await this.prisma.user.findUnique({
      where: { id: clientId },
      select: { is_frequent: true },
    });

    const payment_condition = user?.is_frequent ? 'CASH_ON_DELIVERY' : 'ADVANCE_50';
    
    // 5. Calcular monto de adelanto si aplica
    const advance_amount = calculateAdvanceAmount(payment_condition, estimatedPrice);

    // 6. Fijar expiración del presupuesto (ahora + 24h)
    const budget_expires_at = new Date();
    budget_expires_at.setHours(budget_expires_at.getHours() + 24);
    const estimated_delivery_at = calculateEstimatedDeliveryAt(serviceType.pricing_model);
    const requiredSpecialty = mapPricingModelToSpecialty(serviceType.pricing_model);

    const operator = await this.prisma.operator.findFirst({
      where: {
        is_active: true,
        specialties: {
          some: {
            specialty: requiredSpecialty,
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
      select: {
        id: true,
      },
    });

    if (!operator) {
      throw new ConflictError(`No hay operarios disponibles con la especialidad ${requiredSpecialty}`);
    }

    // 7. Crear el pedido
    const order = await this.prisma.order.create({
      data: {
        client_id: clientId,
        operator_id: operator.id,
        service_type_id,
        material_id,
        status: 'BUDGETED',
        payment_condition,
        estimated_price: estimatedPrice,
        final_price: estimatedPrice,
        advance_amount,
        budget_expires_at,
        estimated_delivery_at,
        notes,
      },
      include: orderWithOperatorInclude,
    });

    await this.notificationsService.send(order.id, 'BUDGET_READY');

    return order;
  }

  async findByClientId(clientId: string) {
    await this.prisma.order.updateMany({
      where: {
        client_id: clientId,
        status: {
          in: ['BUDGETED', 'CLIENT_REVIEW_PENDING'],
        },
        budget_expires_at: {
          lt: new Date(),
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    const orders = await this.prisma.order.findMany({
      where: {
        client_id: clientId,
      },
      include: orderWithOperatorInclude,
      orderBy: {
        created_at: 'desc',
      },
    });

    return orders.map(({ operator_notes, ...order }) => order);
  }

  async findById(id: string, clientId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        client_id: clientId,
      },
      include: {
        ...orderWithOperatorInclude,
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
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        client_id: clientId
      }
    });

    if (!order) {
      throw new NotFoundError('Pedido no encontrado');
    }

    return await this.prisma.orderFile.create({
      data: {
        order_id: orderId,
        ...fileData
      }
    });
  }

  async confirmReview(orderId: string, clientId: string, reviewNotes?: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        client_id: clientId,
      }
    });

    if (!order) {
      throw new Error('Pedido no encontrado');
    }

    if (order.status !== 'BUDGETED' && order.status !== 'CLIENT_REVIEW_PENDING') {
      throw new BadRequestError(`No se puede confirmar la revisión de un pedido en estado ${order.status}`);
    }

    if (order.budget_expires_at < new Date()) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'EXPIRED' }
      });

      throw new BadRequestError('El presupuesto ha expirado');
    }

    return await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'OPERATOR_REVIEW_PENDING',
        client_review_notes: reviewNotes?.trim() || order.client_review_notes,
        client_reviewed_at: new Date()
      },
      include: orderWithOperatorInclude
    });
  }

  async confirmBudget(orderId: string, clientId: string) {
    return this.confirmReview(orderId, clientId);
  }

  async addObservation(orderId: string, clientId: string, observation: string) {
    if (!observation || observation.trim() === '') {
      throw new BadRequestError('La observación es requerida');
    }

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        client_id: clientId,
      }
    });

    if (!order) {
      throw new Error('Pedido no encontrado');
    }

    if (
      order.status !== 'BUDGETED' &&
      order.status !== 'CLIENT_REVIEW_PENDING' &&
      order.status !== 'OPERATOR_REVIEW_PENDING'
    ) {
      throw new BadRequestError(`No se pueden registrar observaciones para un pedido en estado ${order.status}`);
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CLIENT_REVIEW_PENDING',
        client_review_notes: observation.trim(),
        client_reviewed_at: new Date()
      },
      include: orderWithOperatorInclude
    });

    await this.notificationsService.send(updatedOrder.id, 'CLIENT_OBSERVATION_RECEIVED');

    return updatedOrder;
  }

  async confirmPickup(orderId: string, clientId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        client_id: clientId,
      }
    });

    if (!order) {
      throw new Error('Pedido no encontrado');
    }

    if (order.status !== 'READY') {
      throw new BadRequestError(`No se puede confirmar la recogida de un pedido en estado ${order.status}`);
    }

    // Marcar como DELIVERED y actualizar contador de pedidos completados del cliente
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: 'DELIVERED' }
      });

      const user = await tx.user.update({
        where: { id: clientId },
        data: {
          completed_orders_count: { increment: 1 }
        },
        select: { completed_orders_count: true }
      });

      // Si alcanzó el umbral de 5 pedidos, marcar como frecuente
      if (user.completed_orders_count >= 5) {
        await tx.user.update({
          where: { id: clientId },
          data: { is_frequent: true }
        });
      }

      return updatedOrder;
    });

    await this.notificationsService.send(updated.id, 'ORDER_DELIVERED');

    return updated;
  }

  async getDownloadableFile(clientId: string, orderId: string, fileId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId }
    });

    if (!order) {
      throw new Error('Pedido no encontrado');
    }

    if (order.client_id !== clientId) {
      throw new Error('No tienes permiso para acceder a este archivo');
    }

    const file = await this.prisma.orderFile.findFirst({
      where: {
        id: fileId,
        order_id: orderId
      }
    });

    if (!file) {
      throw new Error('Archivo no encontrado');
    }

    const relativePath = file.file_url.replace(/^\/+/, '').replace(/\//g, path.sep);
    const absolutePath = path.resolve(process.cwd(), relativePath);
    const uploadsRoot = path.resolve(process.cwd(), ENV.UPLOAD_PATH);

    if (!absolutePath.startsWith(uploadsRoot)) {
      throw new Error('Ruta de archivo inválida');
    }

    return {
      absolutePath,
      originalFileName: path.basename(file.file_url),
      fileType: file.file_type
    };
  }

  async getPrimaryDownloadableFile(clientId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId }
    });

    if (!order) {
      throw new Error('Pedido no encontrado');
    }

    if (order.client_id !== clientId) {
      throw new Error('No tienes permiso para acceder a este archivo');
    }

    const file = await this.prisma.orderFile.findFirst({
      where: { order_id: orderId },
      orderBy: { uploaded_at: 'asc' }
    });

    if (!file) {
      throw new Error('Archivo no encontrado');
    }

    const relativePath = file.file_url.replace(/^\/+/, '').replace(/\//g, path.sep);
    const absolutePath = path.resolve(process.cwd(), relativePath);
    const uploadsRoot = path.resolve(process.cwd(), ENV.UPLOAD_PATH);

    if (!absolutePath.startsWith(uploadsRoot)) {
      throw new Error('Ruta de archivo inválida');
    }

    return {
      absolutePath,
      originalFileName: path.basename(file.file_url),
      fileType: file.file_type
    };
  }
}
