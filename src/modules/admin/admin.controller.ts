import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service';

export class AdminController {
  async getPendingPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pendingPayments = await adminService.getPendingPayments();
      res.status(200).json({ data: pendingPayments });
    } catch (error) {
      next(error);
    }
  }

  async approvePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const payment = await adminService.approvePayment(id as string);
      res.status(200).json({ data: payment });
    } catch (error: any) {
      if (error.message === 'Pago no encontrado') {
        res.status(404).json({ error: true, message: error.message });
        return;
      }
      if (error.message === 'El pago no está pendiente de revisión') {
        res.status(400).json({ error: true, message: error.message });
        return;
      }
      next(error);
    }
  }
}

export const adminController = new AdminController();
