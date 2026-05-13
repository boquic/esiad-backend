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
}

export const adminService = new AdminService();
