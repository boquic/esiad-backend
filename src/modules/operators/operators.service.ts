import path from 'path';
import { Prisma, PricingModel, Specialty } from '@prisma/client';
import { ENV } from '../../config/env';
import { prisma } from '../../config/database';
import { notificationsService } from '../notifications/notifications.service';

const operatorQueueOrderInclude = Prisma.validator<Prisma.OrderDefaultArgs>()({
  include: {
    service_type: true,
    material: {
      select: {
        id: true,
        name: true,
        unit: true
      }
    },
    client: {
      select: {
        id: true,
        first_name: true,
        last_name: true,
        dni: true,
        phone: true
      }
    }
  }
});

const operatorDetailOrderInclude = Prisma.validator<Prisma.OrderDefaultArgs>()({
  include: {
    service_type: true,
    material: {
      select: {
        id: true,
        name: true,
        unit: true
      }
    },
    client: {
      select: {
        id: true,
        first_name: true,
        last_name: true,
        dni: true,
        phone: true
      }
    },
    files: true
  }
});

type OperatorQueueOrder = Prisma.OrderGetPayload<typeof operatorQueueOrderInclude>;
type OperatorDetailOrder = Prisma.OrderGetPayload<typeof operatorDetailOrderInclude>;
type OperatorReviewAction = 'APPROVE' | 'RETURN_TO_CLIENT' | 'REJECT';

function mapPricingModelToSpecialty(pricingModel: PricingModel): Specialty {
  switch (pricingModel) {
    case 'PER_UNIT':
      return 'LASER';
    case 'PER_M2':
      return 'PLOTTING';
    case 'PER_VOLUME':
      return 'PRINTING_3D';
    case 'FIXED':
    default:
      return 'MODEL';
  }
}

function buildSafeOperatorOrder(order: OperatorQueueOrder | OperatorDetailOrder) {
  const requiredSpecialty = mapPricingModelToSpecialty(order.service_type.pricing_model);
  const files = 'files' in order && Array.isArray(order.files)
    ? order.files.map((file) => ({
        id: file.id,
        order_id: file.order_id,
        file_type: file.file_type,
        uploaded_at: file.uploaded_at,
        download_url: `/api/operator/orders/${order.id}/files/${file.id}/download`
      }))
    : undefined;

  return {
    id: order.id,
    client_id: order.client_id,
    operator_id: order.operator_id,
    service_type_id: order.service_type_id,
    material_id: order.material_id,
    status: order.status,
    payment_condition: order.payment_condition,
    estimated_price: order.estimated_price,
    final_price: order.final_price,
    advance_amount: order.advance_amount,
    budget_expires_at: order.budget_expires_at,
    estimated_delivery_at: order.estimated_delivery_at,
    client_review_notes: order.client_review_notes,
    client_reviewed_at: order.client_reviewed_at,
    operator_reviewed_at: order.operator_reviewed_at,
    operator_price_adjustment_reason: order.operator_price_adjustment_reason,
    production_time_estimate: order.production_time_estimate,
    production_started_at: order.production_started_at,
    production_ready_at: order.production_ready_at,
    created_at: order.created_at,
    updated_at: order.updated_at,
    notes: order.notes,
    operator_notes: order.operator_notes,
    service_type: {
      id: order.service_type.id,
      name: order.service_type.name,
      pricing_model: order.service_type.pricing_model,
      required_specialty: requiredSpecialty
    },
    material: order.material
      ? {
          id: order.material.id,
          name: order.material.name,
          unit: order.material.unit
        }
      : null,
    client: order.client,
    files
  };
}

export class OperatorsService {
  async getAssignedOrders(userId: string, specialtyFilter?: string) {
    const operator = await prisma.operator.findUnique({
      where: { user_id: userId },
      include: { specialties: true }
    });

    if (!operator) {
      throw new Error('Operario no encontrado');
    }

    const allowedSpecialties = operator.specialties.map((s) => s.specialty);
    const requestedSpecialties = specialtyFilter 
      ? [specialtyFilter.toUpperCase() as Specialty].filter((s) => allowedSpecialties.includes(s))
      : allowedSpecialties;

    const allowedPricingModels: PricingModel[] = requestedSpecialties.map((s) => {
      switch(s) {
        case 'LASER': return 'PER_UNIT';
        case 'PLOTTING': return 'PER_M2';
        case 'PRINTING_3D': return 'PER_VOLUME';
        case 'MODEL':
        default: return 'FIXED';
      }
    });

    const orders = await prisma.order.findMany({
      where: {
        operator_id: operator.id,
        status: {
          in: ['BUDGETED', 'CLIENT_REVIEW_PENDING', 'OPERATOR_REVIEW_PENDING', 'PENDING_PAYMENT', 'IN_PROGRESS', 'READY']
        },
        service_type: {
          pricing_model: {
            in: allowedPricingModels
          }
        }
      },
      ...operatorQueueOrderInclude,
      orderBy: {
        created_at: 'asc'
      }
    });

    return orders
      .sort((left, right) => {
        const leftTime = left.estimated_delivery_at?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const rightTime = right.estimated_delivery_at?.getTime() ?? Number.MAX_SAFE_INTEGER;

        if (leftTime !== rightTime) {
          return leftTime - rightTime;
        }

        return left.created_at.getTime() - right.created_at.getTime();
      })
      .map((order) => buildSafeOperatorOrder(order));
  }

  async getOrderById(userId: string, orderId: string) {
    const operator = await prisma.operator.findUnique({
      where: { user_id: userId }
    });

    if (!operator) {
      throw new Error('Operario no encontrado');
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        operator_id: operator.id
      },
      ...operatorDetailOrderInclude
    });

    if (!order) {
      throw new Error('Pedido no encontrado o no asignado a este operario');
    }

    return buildSafeOperatorOrder(order);
  }

  async updateOrderStatus(userId: string, orderId: string, status: string) {
    const operator = await prisma.operator.findUnique({
      where: { user_id: userId }
    });

    if (!operator) {
      throw new Error('Operario no encontrado');
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId }
    });

    if (!order) {
      throw new Error('Pedido no encontrado');
    }

    if (order.operator_id !== operator.id) {
      throw new Error('No puedes cambiar el estado de un pedido que no te fue asignado');
    }

    if (status !== 'IN_PROGRESS' && status !== 'READY') {
      throw new Error('Estado inválido. Solo puedes marcar el pedido como IN_PROGRESS o READY');
    }

    if (status === 'IN_PROGRESS' && order.status !== 'PENDING_PAYMENT') {
      throw new Error(`Solo se puede marcar como IN_PROGRESS un pedido en estado PENDING_PAYMENT. Estado actual: ${order.status}`);
    }

    if (status === 'READY' && order.status !== 'IN_PROGRESS') {
      throw new Error(`Solo se puede marcar como READY un pedido en estado IN_PROGRESS. Estado actual: ${order.status}`);
    }

    let updatedOrder;

    if (status === 'IN_PROGRESS') {
      updatedOrder = await prisma.$transaction(async (tx) => {
        const pendingPayment = await tx.payment.findFirst({
          where: { order_id: orderId, status: 'PENDING' }
        });

        if (pendingPayment) {
          await tx.payment.update({
            where: { id: pendingPayment.id },
            data: {
              status: 'APPROVED',
              reviewed_at: new Date()
            }
          });
        }

        return tx.order.update({
          where: { id: orderId },
          data: {
            status: 'IN_PROGRESS',
            production_started_at: new Date()
          }
        });
      });

      await notificationsService.send(updatedOrder.id, 'PAYMENT_CONFIRMED');
      await notificationsService.send(updatedOrder.id, 'ORDER_IN_PRODUCTION');
    } else {
      updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'READY',
          production_ready_at: new Date()
        }
      });

      await notificationsService.send(updatedOrder.id, 'ORDER_READY');
    }

    return {
      id: updatedOrder.id,
      status: updatedOrder.status,
      updated_at: updatedOrder.updated_at
    };
  }

  async updateOrderNotes(userId: string, orderId: string, notes: string) {
    const operator = await prisma.operator.findUnique({
      where: { user_id: userId }
    });

    if (!operator) {
      throw new Error('Operario no encontrado');
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId }
    });

    if (!order) {
      throw new Error('Pedido no encontrado');
    }

    if (order.operator_id !== operator.id) {
      throw new Error('No puedes agregar notas a un pedido que no te fue asignado');
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { operator_notes: notes }
    });

    return {
      id: updatedOrder.id,
      operator_notes: updatedOrder.operator_notes,
      updated_at: updatedOrder.updated_at
    };
  }

  async reviewOrder(userId: string, orderId: string, action: string, notes?: string) {
    const operator = await prisma.operator.findUnique({
      where: { user_id: userId }
    });

    if (!operator) {
      throw new Error('Operario no encontrado');
    }

    const normalizedAction = action?.toUpperCase() as OperatorReviewAction;
    if (!['APPROVE', 'RETURN_TO_CLIENT', 'REJECT'].includes(normalizedAction)) {
      throw new Error('AcciÃ³n de revisiÃ³n invÃ¡lida');
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId }
    });

    if (!order) {
      throw new Error('Pedido no encontrado');
    }

    if (order.operator_id !== operator.id) {
      throw new Error('No puedes revisar un pedido que no te fue asignado');
    }

    if (normalizedAction === 'APPROVE') {
      if (order.status !== 'OPERATOR_REVIEW_PENDING') {
        throw new Error(`Solo se puede aprobar un pedido en estado OPERATOR_REVIEW_PENDING. Estado actual: ${order.status}`);
      }

      const now = new Date();
      const nextStatus = order.payment_condition === 'CASH_ON_DELIVERY' ? 'IN_PROGRESS' : 'PENDING_PAYMENT';
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: nextStatus,
          final_price: order.final_price ?? order.estimated_price,
          operator_notes: notes?.trim() || order.operator_notes,
          operator_reviewed_at: now,
          production_started_at: nextStatus === 'IN_PROGRESS' ? now : order.production_started_at
        }
      });

      await notificationsService.send(updatedOrder.id, 'OPERATOR_REVIEW_APPROVED');
      if (updatedOrder.status === 'IN_PROGRESS') {
        await notificationsService.send(updatedOrder.id, 'ORDER_IN_PRODUCTION');
      }

      return {
        id: updatedOrder.id,
        status: updatedOrder.status,
        final_price: updatedOrder.final_price,
        operator_reviewed_at: updatedOrder.operator_reviewed_at,
        updated_at: updatedOrder.updated_at
      };
    }

    if (!notes || notes.trim() === '') {
      throw new Error('Las notas de revisiÃ³n son requeridas');
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: normalizedAction === 'RETURN_TO_CLIENT' ? 'CLIENT_REVIEW_PENDING' : 'CANCELLED',
        operator_notes: notes.trim(),
        operator_reviewed_at: new Date()
      }
    });

    return {
      id: updatedOrder.id,
      status: updatedOrder.status,
      operator_notes: updatedOrder.operator_notes,
      operator_reviewed_at: updatedOrder.operator_reviewed_at,
      updated_at: updatedOrder.updated_at
    };
  }

  async updateOrderPrice(userId: string, orderId: string, finalPrice: number, reason: string) {
    const operator = await prisma.operator.findUnique({
      where: { user_id: userId }
    });

    if (!operator) {
      throw new Error('Operario no encontrado');
    }

    if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
      throw new Error('El precio final debe ser mayor a cero');
    }

    if (!reason || reason.trim() === '') {
      throw new Error('El motivo del ajuste de precio es requerido');
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId }
    });

    if (!order) {
      throw new Error('Pedido no encontrado');
    }

    if (order.operator_id !== operator.id) {
      throw new Error('No puedes ajustar un pedido que no te fue asignado');
    }

    if (order.status !== 'OPERATOR_REVIEW_PENDING') {
      throw new Error(`Solo se puede ajustar el precio de un pedido en estado OPERATOR_REVIEW_PENDING. Estado actual: ${order.status}`);
    }

    const finalPriceDecimal = new Prisma.Decimal(finalPrice);
    const budgetExpiresAt = new Date();
    budgetExpiresAt.setHours(budgetExpiresAt.getHours() + 24);

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CLIENT_REVIEW_PENDING',
        final_price: finalPriceDecimal,
        advance_amount: order.payment_condition === 'ADVANCE_50' ? finalPriceDecimal.mul(0.5) : null,
        budget_expires_at: budgetExpiresAt,
        operator_price_adjustment_reason: reason.trim(),
        operator_reviewed_at: new Date()
      }
    });

    await notificationsService.send(updatedOrder.id, 'BUDGET_ADJUSTED');

    return {
      id: updatedOrder.id,
      status: updatedOrder.status,
      estimated_price: updatedOrder.estimated_price,
      final_price: updatedOrder.final_price,
      advance_amount: updatedOrder.advance_amount,
      operator_price_adjustment_reason: updatedOrder.operator_price_adjustment_reason,
      updated_at: updatedOrder.updated_at
    };
  }

  async updateProductionTime(userId: string, orderId: string, productionTimeEstimate: string, estimatedDeliveryAt?: string) {
    const operator = await prisma.operator.findUnique({
      where: { user_id: userId }
    });

    if (!operator) {
      throw new Error('Operario no encontrado');
    }

    if (!productionTimeEstimate || productionTimeEstimate.trim() === '') {
      throw new Error('El tiempo estimado de producciÃ³n es requerido');
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId }
    });

    if (!order) {
      throw new Error('Pedido no encontrado');
    }

    if (order.operator_id !== operator.id) {
      throw new Error('No puedes actualizar un pedido que no te fue asignado');
    }

    if (!['OPERATOR_REVIEW_PENDING', 'PENDING_PAYMENT', 'IN_PROGRESS'].includes(order.status)) {
      throw new Error(`No se puede registrar tiempo de producciÃ³n para un pedido en estado ${order.status}`);
    }

    let parsedEstimatedDeliveryAt: Date | undefined;
    if (estimatedDeliveryAt) {
      parsedEstimatedDeliveryAt = new Date(estimatedDeliveryAt);
      if (Number.isNaN(parsedEstimatedDeliveryAt.getTime())) {
        throw new Error('estimated_delivery_at invÃ¡lido');
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        production_time_estimate: productionTimeEstimate.trim(),
        estimated_delivery_at: parsedEstimatedDeliveryAt
      }
    });

    return {
      id: updatedOrder.id,
      production_time_estimate: updatedOrder.production_time_estimate,
      estimated_delivery_at: updatedOrder.estimated_delivery_at,
      updated_at: updatedOrder.updated_at
    };
  }

  async confirmPickup(userId: string, orderId: string) {
    const operator = await prisma.operator.findUnique({
      where: { user_id: userId }
    });

    if (!operator) {
      throw new Error('Operario no encontrado');
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId }
    });

    if (!order) {
      throw new Error('Pedido no encontrado');
    }

    if (order.operator_id !== operator.id) {
      throw new Error('No puedes confirmar la recogida de un pedido que no te fue asignado');
    }

    if (order.status !== 'READY') {
      throw new Error(`Solo se puede confirmar la recogida de un pedido en estado READY. Estado actual: ${order.status}`);
    }

    // RN: saldo 0 antes de entregar. Los pedidos con contraentrega se saldan en efectivo en el mismo momento
    // de la recogida, por lo que la validación de saldo digital solo aplica a pedidos con adelanto (ADVANCE_50).
    if (order.payment_condition === 'ADVANCE_50') {
      const approvedPayments = await prisma.payment.findMany({
        where: { order_id: orderId, status: 'APPROVED' },
        select: { amount: true }
      });

      const totalPaid = approvedPayments.reduce(
        (total, payment) => total.plus(payment.amount),
        new Prisma.Decimal(0)
      );

      const totalOwed = order.final_price ?? order.estimated_price;
      const balance = totalOwed.minus(totalPaid);

      if (balance.greaterThan(0)) {
        throw new Error(`No se puede confirmar la recogida: el pedido tiene un saldo pendiente de ${balance.toFixed(2)}`);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: 'DELIVERED' }
      });

      const client = await tx.user.update({
        where: { id: order.client_id },
        data: {
          completed_orders_count: { increment: 1 }
        },
        select: { completed_orders_count: true }
      });

      // Si alcanzó el umbral de 5 pedidos, marcar como frecuente
      if (client.completed_orders_count >= 5) {
        await tx.user.update({
          where: { id: order.client_id },
          data: { is_frequent: true }
        });
      }

      return updatedOrder;
    });

    await notificationsService.send(updated.id, 'ORDER_DELIVERED');

    return {
      id: updated.id,
      status: updated.status,
      updated_at: updated.updated_at
    };
  }

  async getDownloadableFile(userId: string, orderId: string, fileId: string) {
    const operator = await prisma.operator.findUnique({
      where: { user_id: userId }
    });

    if (!operator) {
      throw new Error('Operario no encontrado');
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        operator_id: operator.id
      }
    });

    if (!order) {
      throw new Error('Pedido no encontrado o no asignado a este operario');
    }

    const file = await prisma.orderFile.findFirst({
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

  async getPrimaryDownloadableFile(userId: string, orderId: string) {
    const operator = await prisma.operator.findUnique({
      where: { user_id: userId }
    });

    if (!operator) {
      throw new Error('Operario no encontrado');
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        operator_id: operator.id
      }
    });

    if (!order) {
      throw new Error('Pedido no encontrado o no asignado a este operario');
    }

    const file = await prisma.orderFile.findFirst({
      where: {
        order_id: orderId
      },
      orderBy: {
        uploaded_at: 'asc'
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
}
