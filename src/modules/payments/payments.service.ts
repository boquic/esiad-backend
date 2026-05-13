import { prisma } from '../../config/database';

export class PaymentsService {
  async createPayment(userId: string, orderId: string, file?: Express.Multer.File) {
    if (!file) {
      throw new Error('La captura del pago es requerida');
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, client_id: userId }
    });

    if (!order) {
      throw new Error('Pedido no encontrado');
    }

    const pendingPayment = await prisma.payment.findFirst({
      where: { order_id: orderId, status: 'PENDING' }
    });

    if (pendingPayment) {
      throw new Error('Ya existe una captura pendiente de revisión para este pedido');
    }

    const paymentType = order.payment_condition === 'ADVANCE_50' ? 'ADVANCE' : 'FINAL';
    const amount = order.payment_condition === 'ADVANCE_50' ? order.advance_amount! : order.estimated_price;

    const payment = await prisma.payment.create({
      data: {
        order_id: orderId,
        amount,
        payment_type: paymentType,
        capture_url: `/uploads/${file.filename}`,
        status: 'PENDING'
      }
    });

    return payment;
  }
}

export const paymentsService = new PaymentsService();
