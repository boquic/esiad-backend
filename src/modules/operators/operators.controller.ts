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

  async updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const id = req.params.id as string;
      const { status } = req.body;
      
      if (!status) {
        res.status(400).json({ error: true, message: 'El campo status es requerido' });
        return;
      }

      const order = await operatorsService.updateOrderStatus(userId, id, status);
      res.status(200).json({ data: order });
    } catch (error: any) {
      if (error.message === 'No puedes cambiar el estado de un pedido que no te fue asignado') {
        res.status(403).json({ error: true, message: error.message });
        return;
      }
      if (error.message === 'No se puede cambiar el estado hacia atrás' || error.message.includes('Estado inválido')) {
        res.status(400).json({ error: true, message: error.message });
        return;
      }
      if (error.message === 'Operario no encontrado' || error.message === 'Pedido no encontrado') {
        res.status(404).json({ error: true, message: error.message });
        return;
      }
      next(error);
    }
  }
}

export const operatorsController = new OperatorsController();
