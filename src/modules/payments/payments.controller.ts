import { NextFunction, Request, Response } from 'express';
import { paymentsService } from './payments.service';

type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
  };
};

export class PaymentsController {
  async createPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user?.id;
      const { order_id } = req.body;
      const file = req.file;

      if (!userId) {
        res.status(401).json({ error: true, message: 'Acceso no autorizado, token no proporcionado' });
        return;
      }

      if (!order_id) {
        res.status(400).json({ error: true, message: 'El order_id es requerido' });
        return;
      }

      const payment = await paymentsService.createPayment(userId, order_id, file);
      res.status(201).json({ data: payment });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Pedido no encontrado') {
          res.status(404).json({ error: true, message: error.message });
          return;
        }

        if (
          error.message === 'Ya existe una captura pendiente de revisión para este pedido' ||
          error.message === 'El pedido ya cuenta con un pago aprobado suficiente'
        ) {
          res.status(409).json({ error: true, message: error.message });
          return;
        }

        if (
          error.message === 'La captura del pago es requerida' ||
          error.message === 'El pedido debe completar la revisiÃ³n antes de subir la captura del pago' ||
          error.message === 'Los pedidos con contraentrega no usan POST /api/payments' ||
          error.message.includes('No se puede registrar un pago para un pedido en estado') ||
          error.message.includes('Formato de archivo no permitido')
        ) {
          res.status(400).json({ error: true, message: error.message });
          return;
        }
      }

      next(error);
    }
  }
}

export const paymentsController = new PaymentsController();
