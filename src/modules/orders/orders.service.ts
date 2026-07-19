import { Prisma, PrismaClient, FileType, PricingModel, Specialty } from '@prisma/client';
import path from 'path';
import { promises as fs } from 'fs';
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
    material_id?: string;
    quantity?: number;
    area?: number;
    volume?: number;
    notes?: string;
  }) {
    // quantity/area/volume siguen siendo aceptados como opcionales por compatibilidad
    // de API, pero ya no se usan aquí: el precio no se calcula en create().
    const { service_type_id, material_id, notes } = data;

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

    // El cliente ya no elige material: si no se envía, se toma el material activo
    // por defecto del servicio. El operario lo ajusta en la revisión del pedido.
    const material = material_id
      ? await this.prisma.material.findUnique({ where: { id: material_id } })
      : await this.prisma.material.findFirst({
          where: { service_type_id, is_active: true },
          orderBy: { name: 'asc' },
        });

    if (!material || !material.is_active || material.service_type_id !== service_type_id) {
      throw new BadRequestError('No hay un material disponible para este servicio');
    }

    // 3. El pedido nace en DRAFT sin presupuesto: ya no se calcula un precio
    // automático a partir de pricing_model/cantidad/área/volumen en create().
    // El catálogo (material.unit_price, pricing_model) se conserva como
    // referencia para cuando el operario defina el precio real en la revisión.
    const estimatedPrice = new Prisma.Decimal(0);

    // 4. Determinar Condición de Pago según is_frequent
    const user = await this.prisma.user.findUnique({
      where: { id: clientId },
      select: { is_frequent: true },
    });

    const payment_condition = user?.is_frequent ? 'CASH_ON_DELIVERY' : 'ADVANCE_50';

    // 5. Sin precio aún no hay adelanto que calcular: final_price y advance_amount
    // quedan sin definir hasta que el operario fije el precio real (son nullable).

    // 6. Fijar expiración del presupuesto (ahora + 24h). Se recalcula al enviar
    // el borrador, que es cuando el presupuesto empieza a correr de verdad.
    const budget_expires_at = new Date();
    budget_expires_at.setHours(budget_expires_at.getHours() + 24);
    const estimated_delivery_at = calculateEstimatedDeliveryAt(serviceType.pricing_model);

    // 7. Crear el pedido como BORRADOR. Mientras esté en DRAFT el cliente puede
    // editarlo (PATCH) o eliminarlo (DELETE). La asignación de operario, el
    // precio real y la notificación BUDGET_READY ocurren al enviarlo (submitDraft)
    // o durante la revisión del operario.
    const order = await this.prisma.order.create({
      data: {
        client_id: clientId,
        service_type_id,
        material_id: material.id,
        status: 'DRAFT',
        payment_condition,
        estimated_price: estimatedPrice,
        budget_expires_at,
        estimated_delivery_at,
        notes,
      },
      include: orderWithOperatorInclude,
    });

    return order;
  }

  /**
   * Devuelve el pedido validando que exista, que pertenezca al cliente y que
   * siga en estado DRAFT. Es la guarda común de PATCH, DELETE y submit.
   */
  private async findEditableDraft(orderId: string, clientId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundError('Pedido no encontrado');
    }

    if (order.client_id !== clientId) {
      throw new ForbiddenError('No tienes permiso para modificar este pedido');
    }

    if (order.status !== 'DRAFT') {
      throw new BadRequestError(
        `Solo se pueden modificar pedidos en estado borrador. Estado actual: ${order.status}`
      );
    }

    return order;
  }

  /**
   * PATCH /api/orders/:id — Edita notas y/o tipo de servicio de un borrador.
   * Al cambiar el servicio se reasigna el material por defecto y se recalcula
   * el precio preliminar y la fecha estimada de entrega.
   */
  async update(
    orderId: string,
    clientId: string,
    data: { service_type_id?: string; notes?: string | null }
  ) {
    const order = await this.findEditableDraft(orderId, clientId);
    const { service_type_id, notes } = data;

    if (service_type_id === undefined && notes === undefined) {
      throw new BadRequestError('No se enviaron campos para actualizar');
    }

    const updateData: Prisma.OrderUpdateInput = {};

    if (notes !== undefined) {
      const trimmed = typeof notes === 'string' ? notes.trim() : null;
      updateData.notes = trimmed ? trimmed : null;
    }

    if (service_type_id !== undefined && service_type_id !== order.service_type_id) {
      const serviceType = await this.prisma.serviceType.findUnique({
        where: { id: service_type_id },
      });

      if (!serviceType || !serviceType.is_active) {
        throw new BadRequestError('Servicio no encontrado o inactivo');
      }

      const material = await this.prisma.material.findFirst({
        where: { service_type_id, is_active: true },
        orderBy: { name: 'asc' },
      });

      if (!material) {
        throw new BadRequestError('No hay un material disponible para este servicio');
      }

      const estimatedPrice =
        serviceType.pricing_model === 'FIXED' ? material.unit_price : material.unit_price.mul(1);

      updateData.service_type = { connect: { id: service_type_id } };
      updateData.material = { connect: { id: material.id } };
      updateData.estimated_price = estimatedPrice;
      updateData.final_price = estimatedPrice;
      updateData.advance_amount = calculateAdvanceAmount(order.payment_condition, estimatedPrice);
      updateData.estimated_delivery_at = calculateEstimatedDeliveryAt(serviceType.pricing_model);
    }

    return await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: orderWithOperatorInclude,
    });
  }

  /**
   * DELETE /api/orders/:id — Borrado físico de un borrador junto con sus
   * archivos (registros en BD y ficheros en disco). Solo aplica en DRAFT, por
   * lo que nunca hay pagos ni notificaciones asociadas que arrastrar.
   */
  async remove(orderId: string, clientId: string) {
    await this.findEditableDraft(orderId, clientId);

    const files = await this.prisma.orderFile.findMany({
      where: { order_id: orderId },
      select: { file_url: true },
    });

    await this.prisma.$transaction([
      this.prisma.orderFile.deleteMany({ where: { order_id: orderId } }),
      this.prisma.order.delete({ where: { id: orderId } }),
    ]);

    // Los ficheros en disco se borran después de confirmar la transacción.
    const uploadsRoot = path.resolve(process.cwd(), ENV.UPLOAD_PATH);

    for (const file of files) {
      const relativePath = file.file_url.replace(/^\/+/, '').replace(/\//g, path.sep);
      const absolutePath = path.resolve(process.cwd(), relativePath);

      if (!absolutePath.startsWith(uploadsRoot)) {
        continue;
      }

      try {
        await fs.unlink(absolutePath);
      } catch {
        // El fichero ya no existe: no es un error para el cliente.
      }
    }

    return { id: orderId, deleted: true };
  }

  /**
   * Envía un borrador: asigna operario, reinicia la vigencia del presupuesto
   * y notifica. DRAFT -> BUDGETED.
   */
  async submitDraft(orderId: string, clientId: string) {
    const order = await this.findEditableDraft(orderId, clientId);

    const serviceType = await this.prisma.serviceType.findUnique({
      where: { id: order.service_type_id },
    });

    if (!serviceType || !serviceType.is_active) {
      throw new BadRequestError('Servicio no encontrado o inactivo');
    }

    const filesCount = await this.prisma.orderFile.count({ where: { order_id: orderId } });

    if (filesCount === 0) {
      throw new BadRequestError('Debes adjuntar el plano antes de enviar el pedido');
    }

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

    const budget_expires_at = new Date();
    budget_expires_at.setHours(budget_expires_at.getHours() + 24);

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'BUDGETED',
        operator_id: operator.id,
        budget_expires_at,
      },
      include: orderWithOperatorInclude,
    });

    await this.notificationsService.send(updatedOrder.id, 'BUDGET_READY');

    return updatedOrder;
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
