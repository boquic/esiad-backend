import { NextFunction, Request, Response } from 'express';
import { adminService } from './admin.service';

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }

  if (typeof value === 'string' && value.trim() !== '') {
    return value.split(',').map((item) => item.trim());
  }

  return [];
}

export class AdminController {
  async getPendingPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pendingPayments = await adminService.getPendingPayments();
      res.status(200).json({ data: pendingPayments, total: pendingPayments.length });
    } catch (error) {
      next(error);
    }
  }

  async approvePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payment = await adminService.approvePayment(req.params.id as string);
      res.status(200).json({ data: payment });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Pago no encontrado') {
          res.status(404).json({ error: true, message: error.message });
          return;
        }

        if (error.message === 'El pago no está pendiente de revisión') {
          res.status(400).json({ error: true, message: error.message });
          return;
        }
      }

      next(error);
    }
  }

  async rejectPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminComment = req.body.admin_comment as string;
      const payment = await adminService.rejectPayment(req.params.id as string, adminComment);
      res.status(200).json({ data: payment });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Pago no encontrado') {
          res.status(404).json({ error: true, message: error.message });
          return;
        }

        if (
          error.message === 'El pago no está pendiente de revisión' ||
          error.message === 'El comentario de rechazo es obligatorio'
        ) {
          res.status(400).json({ error: true, message: error.message });
          return;
        }
      }

      next(error);
    }
  }

  async assignOperator(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await adminService.assignOperator(
        req.params.id as string,
        req.body.operator_id as string,
      );

      res.status(200).json({ data: order });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Pedido no encontrado' || error.message === 'Operario no encontrado') {
          res.status(404).json({ error: true, message: error.message });
          return;
        }

        if (
          error.message === 'El ID del operario es requerido' ||
          error.message === 'La especialidad del operario no coincide con el servicio del pedido'
        ) {
          res.status(400).json({ error: true, message: error.message });
          return;
        }
      }

      next(error);
    }
  }

  async getSalesStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await adminService.getSalesStats({
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        range: req.query.range as string | undefined,
      });

      res.status(200).json({ data: stats });
    } catch (error) {
      if (error instanceof Error && error.message.includes('fecha')) {
        res.status(400).json({ error: true, message: error.message });
        return;
      }

      next(error);
    }
  }

  async getServicesStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await adminService.getServicesStats();
      res.status(200).json({ data: stats, total: stats.length });
    } catch (error) {
      next(error);
    }
  }

  async getTopClients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await adminService.getTopClients();
      res.status(200).json({ data: stats, total: stats.length });
    } catch (error) {
      next(error);
    }
  }

  async getOperatorsStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await adminService.getOperatorsStats();
      res.status(200).json({ data: stats, total: stats.length });
    } catch (error) {
      next(error);
    }
  }

  async getOrdersByStatusStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await adminService.getOrdersByStatusStats();
      res.status(200).json({ data: stats, total: stats.length });
    } catch (error) {
      next(error);
    }
  }

  async getAdminOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.getAdminOrders({
        status: req.query.status as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
      });

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes('fecha')) {
        res.status(400).json({ error: true, message: error.message });
        return;
      }

      next(error);
    }
  }

  async getClients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.getClients();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getOperators(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.getOperators();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async toggleOperator(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const operator = await adminService.toggleOperator(req.params.id as string);
      res.status(200).json({ data: operator });
    } catch (error) {
      if (error instanceof Error && error.message === 'Operario no encontrado') {
        res.status(404).json({ error: true, message: error.message });
        return;
      }

      next(error);
    }
  }

  async createOperator(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const specialties = adminService.parseSpecialties(parseStringArray(req.body.specialties));
      const { dni, first_name, last_name, phone, password } = req.body as Record<string, string>;

      if (!dni || !first_name || !last_name || !phone || !password) {
        res.status(400).json({ error: true, message: 'Todos los campos del operario son requeridos' });
        return;
      }

      const operator = await adminService.createOperator({
        dni: dni.trim(),
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: phone.trim(),
        password,
        specialties,
      });

      res.status(201).json({ data: operator });
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message === 'Debe asignar al menos una especialidad al operario' ||
          error.message === 'Especialidad inválida'
        ) {
          res.status(400).json({ error: true, message: error.message });
          return;
        }

        if (error.message === 'DNI ya registrado' || error.message === 'Celular ya registrado') {
          res.status(409).json({ error: true, message: error.message });
          return;
        }
      }

      next(error);
    }
  }

  async updateOperator(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const specialtiesInput = req.body.specialties as unknown;
      const specialties =
        specialtiesInput !== undefined
          ? adminService.parseSpecialties(parseStringArray(specialtiesInput))
          : undefined;

      const operator = await adminService.updateOperator(req.params.id as string, {
        dni: typeof req.body.dni === 'string' ? req.body.dni.trim() : undefined,
        first_name: typeof req.body.first_name === 'string' ? req.body.first_name.trim() : undefined,
        last_name: typeof req.body.last_name === 'string' ? req.body.last_name.trim() : undefined,
        phone: typeof req.body.phone === 'string' ? req.body.phone.trim() : undefined,
        password: typeof req.body.password === 'string' ? req.body.password : undefined,
        specialties,
      });

      res.status(200).json({ data: operator });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Operario no encontrado') {
          res.status(404).json({ error: true, message: error.message });
          return;
        }

        if (
          error.message === 'Debe asignar al menos una especialidad al operario' ||
          error.message === 'Especialidad inválida'
        ) {
          res.status(400).json({ error: true, message: error.message });
          return;
        }

        if (error.message === 'DNI ya registrado' || error.message === 'Celular ya registrado') {
          res.status(409).json({ error: true, message: error.message });
          return;
        }
      }

      next(error);
    }
  }

  async deleteOperator(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await adminService.deleteOperator(req.params.id as string);
      res.status(200).json({ data: { deleted: true } });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Operario no encontrado') {
          res.status(404).json({ error: true, message: error.message });
          return;
        }

        if (error.message === 'No se puede eliminar un operario con pedidos activos en progreso') {
          res.status(409).json({ error: true, message: error.message });
          return;
        }
      }

      next(error);
    }
  }

  async updateClientFrequentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const isFrequent =
        typeof req.body.is_frequent === 'boolean' ? req.body.is_frequent : true;

      const client = await adminService.updateClientFrequentStatus(req.params.id as string, {
        is_frequent: isFrequent,
      });

      res.status(200).json({ data: client });
    } catch (error) {
      if (error instanceof Error && error.message === 'Cliente no encontrado') {
        res.status(404).json({ error: true, message: error.message });
        return;
      }

      next(error);
    }
  }

  async exportOrdersReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const buffer = await adminService.exportOrdersReport({
        status: req.query.status as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename="admin-orders-report.xlsx"');
      res.status(200).send(buffer);
    } catch (error) {
      if (error instanceof Error && error.message.includes('fecha')) {
        res.status(400).json({ error: true, message: error.message });
        return;
      }

      next(error);
    }
  }
}

export const adminController = new AdminController();
