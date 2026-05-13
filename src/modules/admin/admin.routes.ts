import { Router } from 'express';
import { adminController } from './admin.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';

const router = Router();

router.get(
  '/payments/pending',
  authMiddleware,
  requireRole(['ADMIN']),
  adminController.getPendingPayments
);

router.patch(
  '/payments/:id/approve',
  authMiddleware,
  requireRole(['ADMIN']),
  adminController.approvePayment
);

router.patch(
  '/payments/:id/reject',
  authMiddleware,
  requireRole(['ADMIN']),
  adminController.rejectPayment
);

router.patch(
  '/orders/:id/assign',
  authMiddleware,
  requireRole(['ADMIN']),
  adminController.assignOperator
);

router.get(
  '/stats/sales',
  authMiddleware,
  requireRole(['ADMIN']),
  adminController.getSalesStats
);

router.get(
  '/stats/services',
  authMiddleware,
  requireRole(['ADMIN']),
  adminController.getServicesStats
);

router.get(
  '/stats/clients',
  authMiddleware,
  requireRole(['ADMIN']),
  adminController.getTopClients
);

export default router;
