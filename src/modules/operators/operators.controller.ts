import { Request, Response, NextFunction } from 'express';
import { OperatorsService } from './operators.service';

const operatorsService = new OperatorsService();

export class OperatorsController {
  async getAssignedOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const orders = await operatorsService.getAssignedOrders(userId);
      res.status(200).json({ data: orders });
    } catch (error: any) {
      if (error.message === 'Operario no encontrado') {
        res.status(404).json({ error: true, message: error.message });
        return;
      }
      next(error);
    }
  }

  async getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const id = req.params.id as string;
      const order = await operatorsService.getOrderById(userId, id);
      res.status(200).json({ data: order });
    } catch (error: any) {
      if (error.message === 'Operario no encontrado' || error.message === 'Pedido no encontrado o no asignado a este operario') {
        res.status(404).json({ error: true, message: error.message });
        return;
      }
      next(error);
    }
  }
}

export const operatorsController = new OperatorsController();
