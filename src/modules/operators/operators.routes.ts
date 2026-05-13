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

router.patch(
  '/orders/:id/status',
  authMiddleware,
  requireRole(['OPERATOR']),
  operatorsController.updateOrderStatus
);

export default router;
