import { Router } from 'express';
import { operatorsController } from './operators.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';

const router = Router();

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
