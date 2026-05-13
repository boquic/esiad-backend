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

export default router;
