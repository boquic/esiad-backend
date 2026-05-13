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
}

export const adminService = new AdminService();
