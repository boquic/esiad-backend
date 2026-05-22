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
  async getAssignedOrders(userId: string) {
    const operator = await prisma.operator.findUnique({
      where: { user_id: userId },
      include: { specialties: true }
    });

    if (!operator) {
      throw new Error('Operario no encontrado');
    }

    const orders = await prisma.order.findMany({
      where: {
        operator_id: operator.id,
        status: {
          in: ['IN_PROGRESS', 'READY']
        }
      },
      ...operatorQueueOrderInclude,
      orderBy: {
        created_at: 'asc'
      }
    });

    const allowedSpecialties = new Set(operator.specialties.map((specialty) => specialty.specialty));

    return orders
      .filter((order) => allowedSpecialties.has(mapPricingModelToSpecialty(order.service_type.pricing_model)))
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

    if (status !== 'READY') {
      throw new Error('Estado inválido. Solo puedes marcar el pedido como READY');
    }

    if (order.status !== 'IN_PROGRESS') {
      throw new Error(`Solo se puede marcar como READY un pedido en estado IN_PROGRESS. Estado actual: ${order.status}`);
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'READY' }
    });

    await notificationsService.send(updatedOrder.id, 'ORDER_READY');

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
}
