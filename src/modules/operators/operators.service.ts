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
}
