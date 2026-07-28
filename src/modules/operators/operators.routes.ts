import { NextFunction, Request, Response, Router } from 'express';
import { operatorsController } from './operators.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { buildUploadErrorResponse, uploadImageMiddleware } from '../../middlewares/upload.middleware';

const router = Router();

const handleBalancePaymentCaptureUpload = (req: Request, res: Response, next: NextFunction): void => {
  const upload = uploadImageMiddleware.single('capture');

  upload(req, res, (error: unknown) => {
    const uploadError = buildUploadErrorResponse(error);

    if (uploadError) {
      res.status(uploadError.status).json({ error: true, message: uploadError.message });
      return;
    }

    next();
  });
};

router.get(
  '/orders',
  authMiddleware,
  requireRole(['OPERATOR']),
  operatorsController.getAssignedOrders
);

router.get(
  '/orders/:id',
  authMiddleware,
  requireRole(['OPERATOR']),
  operatorsController.getOrderById
);

router.get(
  '/orders/:id/file',
  authMiddleware,
  requireRole(['OPERATOR']),
  operatorsController.downloadPrimaryOrderFile
);

router.get(
  '/orders/:id/files/:fileId/download',
  authMiddleware,
  requireRole(['OPERATOR']),
  operatorsController.downloadOrderFile
);

router.patch(
  '/orders/:id/status',
  authMiddleware,
  requireRole(['OPERATOR']),
  operatorsController.updateOrderStatus
);

// El operario verifica el comprobante (fuera del sistema) y confirma el pago: PENDING_PAYMENT -> PAID
router.post(
  '/orders/:id/confirm-payment',
  authMiddleware,
  requireRole(['OPERATOR']),
  operatorsController.confirmPayment
);

// El operario revisó el comprobante y determina que el pago no se realizó:
// el pedido se queda en PENDING_PAYMENT para que el cliente reintente.
router.post(
  '/orders/:id/reject-payment',
  authMiddleware,
  requireRole(['OPERATOR']),
  operatorsController.rejectPayment
);

// Ver la captura del comprobante que subió el cliente antes de confirmar/rechazar el pago.
router.get(
  '/orders/:id/payment-voucher',
  authMiddleware,
  requireRole(['OPERATOR']),
  operatorsController.downloadPaymentVoucher
);

// El operario registra (opcionalmente) el pago del saldo restante de un pedido
// READY que el cliente pagó presencialmente, subiendo la foto de la captura.
router.post(
  '/orders/:id/balance-payment',
  authMiddleware,
  requireRole(['OPERATOR']),
  handleBalancePaymentCaptureUpload,
  operatorsController.uploadBalancePaymentCapture
);

router.post(
  '/orders/:id/review',
  authMiddleware,
  requireRole(['OPERATOR']),
  operatorsController.reviewOrder
);

router.patch(
  '/orders/:id/price',
  authMiddleware,
  requireRole(['OPERATOR']),
  operatorsController.updateOrderPrice
);

router.patch(
  '/orders/:id/production-time',
  authMiddleware,
  requireRole(['OPERATOR']),
  operatorsController.updateProductionTime
);

router.patch(
  '/orders/:id/notes',
  authMiddleware,
  requireRole(['OPERATOR']),
  operatorsController.updateOrderNotes
);

// Confirmar recogida cuando el cliente llega al local (cierra el pedido: DELIVERED)
router.post(
  '/orders/:id/confirm-pickup',
  authMiddleware,
  requireRole(['OPERATOR']),
  operatorsController.confirmPickup
);

export default router;
