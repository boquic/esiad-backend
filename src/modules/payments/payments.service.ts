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

    // PENDING_PAYMENT: pago del adelanto (50%) antes de iniciar producción.
    // READY: el pedido ya está listo para recoger y queda el saldo restante
    // (50%) pendiente; el cliente puede pagarlo por adelantado aquí mismo, o
    // simplemente pagar presencialmente al recoger (por eso este pago es
    // opcional y no bloquea la entrega).
    const isAdvanceStage = order.status === 'PENDING_PAYMENT';
    const isBalanceStage = order.status === 'READY';

    if (!isAdvanceStage && !isBalanceStage) {
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

    let amountToCharge: Prisma.Decimal;
    let paymentType: 'ADVANCE' | 'FINAL';

    if (isAdvanceStage) {
      const requiredAdvance = order.advance_amount ?? order.final_price ?? order.estimated_price;
      if (approvedAmount.greaterThanOrEqualTo(requiredAdvance)) {
        throw new Error('El pedido ya cuenta con un pago aprobado suficiente');
      }
      amountToCharge = requiredAdvance;
      paymentType = 'ADVANCE';
    } else {
      const totalOwed = order.final_price ?? order.estimated_price;
      const remainingBalance = totalOwed.minus(approvedAmount);
      if (remainingBalance.lessThanOrEqualTo(0)) {
        throw new Error('El pedido ya cuenta con un pago aprobado suficiente');
      }
      amountToCharge = remainingBalance;
      paymentType = 'FINAL';
    }

    const payment = await prisma.payment.create({
      data: {
        order_id: orderId,
        amount: amountToCharge,
        payment_type: paymentType,
        capture_url: `/uploads/${file.filename}`,
        status: 'PENDING'
      }
    });

    return payment;
  }
}

export const paymentsService = new PaymentsService();
