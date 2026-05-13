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

  async rejectPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { admin_comment } = req.body;
      const payment = await adminService.rejectPayment(id as string, admin_comment);
      res.status(200).json({ data: payment });
    } catch (error: any) {
      if (error.message === 'Pago no encontrado') {
        res.status(404).json({ error: true, message: error.message });
        return;
      }
      if (error.message === 'El pago no está pendiente de revisión' || error.message === 'El comentario de rechazo es obligatorio') {
        res.status(400).json({ error: true, message: error.message });
        return;
      }
      next(error);
    }
  }

  async assignOperator(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { operator_id } = req.body;
      const order = await adminService.assignOperator(id as string, operator_id);
      res.status(200).json({ data: order });
    } catch (error: any) {
      if (error.message === 'Pedido no encontrado' || error.message === 'Operario no encontrado') {
        res.status(404).json({ error: true, message: error.message });
        return;
      }
      if (error.message === 'El ID del operario es requerido' || error.message === 'La especialidad del operario no coincide con el servicio del pedido') {
        res.status(400).json({ error: true, message: error.message });
        return;
      }
      next(error);
    }
  }

  async getSalesStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const stats = await adminService.getSalesStats(startDate as string, endDate as string);
      res.status(200).json({ data: stats });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
