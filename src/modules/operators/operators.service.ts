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
    budget_expires_at: order.budget_expires_at,
    estimated_delivery_at: order.estimated_delivery_at,
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
    material: {
      id: order.material.id,
      name: order.material.name,
      unit: order.material.unit
    },
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
          in: ['PENDING_PAYMENT', 'IN_PROGRESS', 'READY']
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
          data: { status: 'IN_PROGRESS' }
        });
      });

      await notificationsService.send(updatedOrder.id, 'PAYMENT_CONFIRMED');
    } else {
      updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: 'READY' }
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
