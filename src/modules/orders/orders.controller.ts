import { Request, Response } from 'express';
import path from 'path';
import { OrdersService } from './orders.service';
import { prisma } from '../../config/database';
import { notificationsService } from '../notifications/notifications.service';
import { BadRequestError } from '../../utils/errors';

const ordersService = new OrdersService(prisma, notificationsService);

export class OrdersController {
  async create(req: Request, res: Response): Promise<any> {
    const clientId = req.user.id as string;
    const { service_type_id, material_id, quantity, area, volume, notes } = req.body;

    if (!service_type_id || !material_id) {
      throw new BadRequestError('El tipo de servicio y el material son requeridos');
    }

    const order = await ordersService.create(clientId, {
      service_type_id,
      material_id,
      quantity,
      area,
      volume,
      notes
    });

    return res.status(201).json({ data: order });
  }

  async findMyOrders(req: Request, res: Response): Promise<any> {
    const clientId = req.user.id as string;
    const orders = await ordersService.findByClientId(clientId);
    return res.status(200).json({ data: orders });
  }

  async findById(req: Request, res: Response): Promise<any> {
    const clientId = req.user.id as string;
    const id = req.params.id as string;

    const order = await ordersService.findById(id, clientId);

    if (!order) {
      return res.status(404).json({ error: true, message: 'Pedido no encontrado' });
    }

    return res.status(200).json({ data: order });
  }

  async uploadFile(req: Request, res: Response): Promise<any> {
    const clientId = req.user.id as string;
    const id = req.params.id as string;
    const file = req.file;

    if (!file) {
      throw new BadRequestError('No se ha subido ningún archivo');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    let file_type: 'PLAN_DWG' | 'PLAN_DXF' | 'PLAN_PDF';

    if (ext === '.dwg') file_type = 'PLAN_DWG';
    else if (ext === '.dxf') file_type = 'PLAN_DXF';
    else file_type = 'PLAN_PDF';

    const orderFile = await ordersService.addFile(id, clientId, {
      file_url: `/uploads/${file.filename}`,
      file_type
    });

    return res.status(201).json({ data: orderFile });
  }

  async confirmBudget(req: Request, res: Response): Promise<any> {
    const clientId = req.user.id as string;
    const id = req.params.id as string;

    const order = await ordersService.confirmBudget(id, clientId);
    return res.status(200).json({ data: order });
  }

  async confirmReview(req: Request, res: Response): Promise<any> {
    const clientId = req.user.id as string;
    const id = req.params.id as string;
    const { notes } = req.body;

    const order = await ordersService.confirmReview(id, clientId, notes);
    return res.status(200).json({ data: order });
  }

  async addObservation(req: Request, res: Response): Promise<any> {
    const clientId = req.user.id as string;
    const id = req.params.id as string;
    const { observation, notes } = req.body;

    const order = await ordersService.addObservation(id, clientId, observation ?? notes);
    return res.status(200).json({ data: order });
  }

  async confirmPickup(req: Request, res: Response): Promise<any> {
    const clientId = req.user.id as string;
    const id = req.params.id as string;

    const order = await ordersService.confirmPickup(id, clientId);
    return res.status(200).json({ data: order });
  }

  async downloadOrderFile(req: Request, res: Response): Promise<any> {
    const clientId = req.user.id as string;
    const orderId = req.params.id as string;
    const fileId = req.params.fileId as string;

    if (!clientId) {
      return res.status(401).json({ error: true, message: 'Acceso no autorizado, token no proporcionado' });
    }

    const file = await ordersService.getDownloadableFile(clientId, orderId, fileId);
    res.download(file.absolutePath, file.originalFileName);
  }

  async downloadPrimaryOrderFile(req: Request, res: Response): Promise<any> {
    const clientId = req.user.id as string;
    const orderId = req.params.id as string;

    if (!clientId) {
      return res.status(401).json({ error: true, message: 'Acceso no autorizado, token no proporcionado' });
    }

    const file = await ordersService.getPrimaryDownloadableFile(clientId, orderId);
    res.download(file.absolutePath, file.originalFileName);
  }
}
