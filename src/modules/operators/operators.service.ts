import { prisma } from '../../config/database';

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
        operator_id: operator.id
      },
      include: {
        service_type: true,
        material: true,
        client: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            dni: true,
            phone: true
          }
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    // Strip sensitive info (prices, advance amount) to follow RN# Operator
    return orders.map((order: any) => {
      const { estimated_price, advance_amount, payments, ...safeOrder } = order;
      return safeOrder;
    });
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
      include: {
        service_type: true,
        material: true,
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

    if (!order) {
      throw new Error('Pedido no encontrado o no asignado a este operario');
    }

    const { estimated_price, advance_amount, payments, ...safeOrder } = order as any;
    return safeOrder;
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

    // Un operario no puede cambiar estado hacia atrás
    if (order.status === 'READY' && status === 'IN_PROGRESS') {
      throw new Error('No se puede cambiar el estado hacia atrás');
    }

    if (status !== 'READY') {
      throw new Error('Estado inválido. Solo puedes marcar el pedido como READY');
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'READY' }
    });

    const { estimated_price, advance_amount, payments, ...safeOrder } = updatedOrder as any;
    return safeOrder;
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
      data: { notes }
    });

    const { estimated_price, advance_amount, payments, ...safeOrder } = updatedOrder as any;
    return safeOrder;
  }
}
