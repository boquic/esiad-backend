import { Router } from 'express';
import { paymentsController } from './payments.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { uploadImageMiddleware } from '../../middlewares/upload.middleware';

const router = Router();

router.post(
  '/',
  authMiddleware,
  requireRole(['CLIENT']),
  (req, res, next) => {
    const upload = uploadImageMiddleware.single('capture');
    upload(req, res, (err: any) => {
      if (err) {
        return res.status(400).json({ error: true, message: err.message });
      }
      next();
    });
  },
  paymentsController.createPayment
);

export default router;
