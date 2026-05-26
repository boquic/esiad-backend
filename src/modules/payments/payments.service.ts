import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

export class PaymentsService {
  async createPayment(userId: string, orderId: string, file?: Express.Multer.File) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, client_id: userId }
    });

    if (!order) {
      throw new Error('Pedido no encontrado');
    }

    if (
      order.status === 'BUDGETED' ||
      order.status === 'CLIENT_REVIEW_PENDING' ||
      order.status === 'OPERATOR_REVIEW_PENDING'
    ) {
      throw new Error('El pedido debe completar la revisiÃ³n antes de subir la captura del pago');
    }

    if (order.status !== 'PENDING_PAYMENT') {
      throw new Error(`No se puede registrar un pago para un pedido en estado ${order.status}`);
    }

    if (order.payment_condition === 'CASH_ON_DELIVERY') {
      throw new Error('Los pedidos con contraentrega no usan POST /api/payments');
    }

    if (!file) {
      throw new Error('La captura del pago es requerida');
    }

    const pendingPayment = await prisma.payment.findFirst({
      where: { order_id: orderId, status: 'PENDING' }
    });

    if (pendingPayment) {
      throw new Error('Ya existe una captura pendiente de revisión para este pedido');
    }

    const approvedPayments = await prisma.payment.findMany({
      where: { order_id: orderId, status: 'APPROVED' },
      select: { amount: true }
    });

    const approvedAmount = approvedPayments.reduce(
      (total, payment) => total.plus(payment.amount),
      new Prisma.Decimal(0)
    );

    const requiredAmount = order.advance_amount ?? order.final_price ?? order.estimated_price;

    if (approvedAmount.greaterThanOrEqualTo(requiredAmount)) {
      throw new Error('El pedido ya cuenta con un pago aprobado suficiente');
    }

    const payment = await prisma.payment.create({
      data: {
        order_id: orderId,
        amount: order.advance_amount ?? order.final_price ?? order.estimated_price,
        payment_type: 'ADVANCE',
        capture_url: `/uploads/${file.filename}`,
        status: 'PENDING'
      }
    });

    return payment;
  }
}

export const paymentsService = new PaymentsService();
