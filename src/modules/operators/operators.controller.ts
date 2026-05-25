import { Request, Response, NextFunction } from 'express';
import { OperatorsService } from './operators.service';

const operatorsService = new OperatorsService();

type AuthenticatedOperatorRequest = Request & {
  user?: {
    id?: string;
  };
};

export class OperatorsController {
  async getAssignedOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthenticatedOperatorRequest).user?.id;

      if (!userId) {
        res.status(401).json({ error: true, message: 'Acceso no autorizado, token no proporcionado' });
        return;
      }

      const specialty = req.query.specialty as string | undefined;

      const orders = await operatorsService.getAssignedOrders(userId, specialty);
      res.status(200).json({ data: orders });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Operario no encontrado') {
          res.status(404).json({ error: true, message: error.message });
          return;
        }
      }
      next(error);
    }
  }

  async getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthenticatedOperatorRequest).user?.id;
      const id = req.params.id as string;

      if (!userId) {
        res.status(401).json({ error: true, message: 'Acceso no autorizado, token no proporcionado' });
        return;
      }

      const order = await operatorsService.getOrderById(userId, id);
      res.status(200).json({ data: order });
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message === 'Operario no encontrado' ||
          error.message === 'Pedido no encontrado o no asignado a este operario'
        ) {
          res.status(404).json({ error: true, message: error.message });
          return;
        }
      }
      next(error);
    }
  }

  async updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthenticatedOperatorRequest).user?.id;
      const id = req.params.id as string;
      const { status } = req.body;

      if (!userId) {
        res.status(401).json({ error: true, message: 'Acceso no autorizado, token no proporcionado' });
        return;
      }
      
      if (!status) {
        res.status(400).json({ error: true, message: 'El campo status es requerido' });
        return;
      }

      const order = await operatorsService.updateOrderStatus(userId, id, status);
      res.status(200).json({ data: order });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'No puedes cambiar el estado de un pedido que no te fue asignado') {
          res.status(403).json({ error: true, message: error.message });
          return;
        }
        if (
          error.message.includes('Estado inválido') ||
          error.message.includes('Solo se puede marcar como READY') ||
          error.message.includes('Solo se puede marcar como IN_PROGRESS')
        ) {
          res.status(400).json({ error: true, message: error.message });
          return;
        }
        if (error.message === 'Operario no encontrado' || error.message === 'Pedido no encontrado') {
          res.status(404).json({ error: true, message: error.message });
          return;
        }
      }
      next(error);
    }
  }

  async updateOrderNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthenticatedOperatorRequest).user?.id;
      const id = req.params.id as string;
      const { notes } = req.body;

      if (!userId) {
        res.status(401).json({ error: true, message: 'Acceso no autorizado, token no proporcionado' });
        return;
      }
      
      if (notes === undefined) {
        res.status(400).json({ error: true, message: 'El campo notes es requerido' });
        return;
      }

      const order = await operatorsService.updateOrderNotes(userId, id, notes);
      res.status(200).json({ data: order });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'No puedes agregar notas a un pedido que no te fue asignado') {
          res.status(403).json({ error: true, message: error.message });
          return;
        }
        if (error.message === 'Operario no encontrado' || error.message === 'Pedido no encontrado') {
          res.status(404).json({ error: true, message: error.message });
          return;
        }
      }
      next(error);
    }
  }

  async downloadOrderFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthenticatedOperatorRequest).user?.id;
      const orderId = req.params.id as string;
      const fileId = req.params.fileId as string;

      if (!userId) {
        res.status(401).json({ error: true, message: 'Acceso no autorizado, token no proporcionado' });
        return;
      }

      const file = await operatorsService.getDownloadableFile(userId, orderId, fileId);
      res.download(file.absolutePath, file.originalFileName);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Ruta de archivo inválida') {
          res.status(400).json({ error: true, message: error.message });
          return;
        }
        if (
          error.message === 'Operario no encontrado' ||
          error.message === 'Pedido no encontrado o no asignado a este operario' ||
          error.message === 'Archivo no encontrado'
        ) {
          res.status(404).json({ error: true, message: error.message });
          return;
        }
      }
      next(error);
    }
  }

  async downloadPrimaryOrderFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthenticatedOperatorRequest).user?.id;
      const orderId = req.params.id as string;

      if (!userId) {
        res.status(401).json({ error: true, message: 'Acceso no autorizado, token no proporcionado' });
        return;
      }

      const file = await operatorsService.getPrimaryDownloadableFile(userId, orderId);
      res.download(file.absolutePath, file.originalFileName);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Ruta de archivo inválida') {
          res.status(400).json({ error: true, message: error.message });
          return;
        }
        if (
          error.message === 'Operario no encontrado' ||
          error.message === 'Pedido no encontrado o no asignado a este operario' ||
          error.message === 'Archivo no encontrado'
        ) {
          res.status(404).json({ error: true, message: error.message });
          return;
        }
      }
      next(error);
    }
  }
}

export const operatorsController = new OperatorsController();
