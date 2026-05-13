import { NextFunction, Request, Response, Router } from 'express';
import { paymentsController } from './payments.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { buildUploadErrorResponse, uploadImageMiddleware } from '../../middlewares/upload.middleware';

const router = Router();

const handlePaymentCaptureUpload = (req: Request, res: Response, next: NextFunction): void => {
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

router.post(
  '/',
  authMiddleware,
  requireRole(['CLIENT']),
  handlePaymentCaptureUpload,
  paymentsController.createPayment
);

export default router;
