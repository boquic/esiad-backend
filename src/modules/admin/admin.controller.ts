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
}

export const adminController = new AdminController();
