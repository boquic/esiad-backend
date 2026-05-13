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

export default router;
