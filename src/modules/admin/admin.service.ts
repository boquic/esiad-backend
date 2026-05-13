import { prisma } from '../../config/database';

export class AdminService {
  async getPendingPayments() {
    const pendingPayments = await prisma.payment.findMany({
      where: { status: 'PENDING' },
      include: {
        order: {
          include: {
            client: {
              select: {
                first_name: true,
                last_name: true,
                dni: true,
                phone: true
              }
            },
            service_type: true
          }
        }
      },
      orderBy: { created_at: 'asc' }
    });

    return pendingPayments;
  }

  async approvePayment(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true }
    });

    if (!payment) {
      throw new Error('Pago no encontrado');
    }

    if (payment.status !== 'PENDING') {
      throw new Error('El pago no está pendiente de revisión');
    }

    const updatedPayment = await prisma.$transaction(async (tx) => {
      const approvedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: { 
          status: 'APPROVED',
          reviewed_at: new Date()
        }
      });

      await tx.order.update({
        where: { id: payment.order_id },
        data: { status: 'IN_PROGRESS' }
      });

      return approvedPayment;
    });

    return updatedPayment;
  }

  async rejectPayment(paymentId: string, adminComment: string) {
    if (!adminComment || adminComment.trim() === '') {
      throw new Error('El comentario de rechazo es obligatorio');
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      throw new Error('Pago no encontrado');
    }

    if (payment.status !== 'PENDING') {
      throw new Error('El pago no está pendiente de revisión');
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REJECTED',
        admin_comment: adminComment,
        reviewed_at: new Date()
      }
    });

    return updatedPayment;
  }

  async assignOperator(orderId: string, operatorId: string) {
    if (!operatorId) {
      throw new Error('El ID del operario es requerido');
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { service_type: true }
    });

    if (!order) {
      throw new Error('Pedido no encontrado');
    }

    const operator = await prisma.operator.findUnique({
      where: { id: operatorId },
      include: { specialties: true }
    });

    if (!operator) {
      throw new Error('Operario no encontrado');
    }

    const serviceName = order.service_type.name.toLowerCase();
    const hasMatchingSpecialty = operator.specialties.some(sp => {
      if (serviceName.includes('láser') || serviceName.includes('laser')) return sp.specialty === 'LASER';
      if (serviceName.includes('ploteo')) return sp.specialty === 'PLOTTING';
      if (serviceName.includes('3d')) return sp.specialty === 'PRINTING_3D';
      if (serviceName.includes('maqueta')) return sp.specialty === 'MODEL';
      return false;
    });

    if (!hasMatchingSpecialty) {
      throw new Error('La especialidad del operario no coincide con el servicio del pedido');
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { operator_id: operatorId }
    });

    return updatedOrder;
  }

  async getSalesStats(startDate?: string, endDate?: string) {
    const whereClause: any = {
      status: 'APPROVED'
    };

    if (startDate || endDate) {
      whereClause.reviewed_at = {};
      if (startDate) {
        whereClause.reviewed_at.gte = new Date(startDate);
      }
      if (endDate) {
        // Al final del día para endDate si no trae hora
        const end = new Date(endDate);
        if (endDate.length === 10) {
          end.setHours(23, 59, 59, 999);
        }
        whereClause.reviewed_at.lte = end;
      }
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      select: {
        amount: true,
        reviewed_at: true
      },
      orderBy: { reviewed_at: 'asc' }
    });

    let totalSales = 0;
    const salesByDate: Record<string, number> = {};

    payments.forEach(p => {
      const amount = Number(p.amount);
      totalSales += amount;
      
      if (p.reviewed_at) {
        const dateStr = p.reviewed_at.toISOString().split('T')[0];
        salesByDate[dateStr] = (salesByDate[dateStr] || 0) + amount;
      }
    });

    const dailySales = Object.keys(salesByDate).map(date => ({
      date,
      total: salesByDate[date]
    }));

    return { totalSales, dailySales };
  }

  async getServicesStats() {
    const orders = await prisma.order.groupBy({
      by: ['service_type_id'],
      _count: {
        id: true
      }
    });

    const services = await prisma.serviceType.findMany({
      select: {
        id: true,
        name: true
      }
    });

    const ranking = orders.map(orderGroup => {
      const service = services.find(s => s.id === orderGroup.service_type_id);
      return {
        service_id: orderGroup.service_type_id,
        service_name: service ? service.name : 'Desconocido',
        count: orderGroup._count.id
      };
    });

    ranking.sort((a, b) => b.count - a.count);

    return ranking;
  }

  async getTopClients() {
    const clients = await prisma.user.findMany({
      where: { role: 'CLIENT' },
      orderBy: { completed_orders_count: 'desc' },
      take: 10,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        dni: true,
        phone: true,
        completed_orders_count: true,
        is_frequent: true
      }
    });

    return clients;
  }

  async getOperatorsStats() {
    const operators = await prisma.operator.findMany({
      include: {
        user: {
          select: {
            first_name: true,
            last_name: true
          }
        },
        orders: {
          where: {
            status: { in: ['READY', 'DELIVERED'] }
          },
          select: {
            created_at: true,
            updated_at: true
          }
        }
      }
    });

    const stats = operators.map(op => {
      const ordersCount = op.orders.length;
      let averageTimeHours = 0;

      if (ordersCount > 0) {
        const totalMs = op.orders.reduce((acc, order) => {
          const diff = order.updated_at.getTime() - order.created_at.getTime();
          return acc + diff;
        }, 0);
        
        const averageMs = totalMs / ordersCount;
        averageTimeHours = Number((averageMs / (1000 * 60 * 60)).toFixed(2));
      }

      return {
        operator_id: op.id,
        first_name: op.user.first_name,
        last_name: op.user.last_name,
        orders_attended: ordersCount,
        average_time_hours: averageTimeHours
      };
    });

    stats.sort((a, b) => b.orders_attended - a.orders_attended);

    return stats;
  }

  async getOrdersByStatusStats() {
    const ordersGrouped = await prisma.order.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    const stats = ordersGrouped.map(group => ({
      status: group.status,
      count: group._count.id
    }));

    return stats;
  }
}

export const adminService = new AdminService();
