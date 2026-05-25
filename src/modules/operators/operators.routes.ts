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

router.patch(
  '/orders/:id/notes',
  authMiddleware,
  requireRole(['OPERATOR']),
  operatorsController.updateOrderNotes
);

export default router;
