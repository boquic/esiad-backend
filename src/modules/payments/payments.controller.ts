import { Request, Response, NextFunction } from 'express';
import { paymentsService } from './payments.service';

export class PaymentsController {
  async createPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { order_id } = req.body;
      const file = req.file;

      if (!order_id) {
        res.status(400).json({ error: true, message: 'El order_id es requerido' });
        return;
      }

      const payment = await paymentsService.createPayment(userId, order_id, file);
      res.status(201).json({ data: payment });
    } catch (error: any) {
      if (error.message === 'Pedido no encontrado') {
        res.status(404).json({ error: true, message: error.message });
        return;
      }
      if (error.message === 'Ya existe una captura pendiente de revisión para este pedido') {
        res.status(409).json({ error: true, message: error.message });
        return;
      }
      if (error.message === 'La captura del pago es requerida') {
        res.status(400).json({ error: true, message: error.message });
        return;
      }
      if (error.message && error.message.includes('Formato de archivo no permitido')) {
        res.status(400).json({ error: true, message: error.message });
        return;
      }
      next(error);
    }
  }
}

export const paymentsController = new PaymentsController();
