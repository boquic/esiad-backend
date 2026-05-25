import { Request, Response } from 'express';
import path from 'path';
import { OrdersService } from './orders.service';

const ordersService = new OrdersService();

export class OrdersController {
  async create(req: Request, res: Response): Promise<any> {
    try {
      const clientId = req.user.id as string;
      const { service_type_id, material_id, quantity, area, volume, notes } = req.body;

      if (!service_type_id || !material_id) {
        return res.status(400).json({ 
          error: true, 
          message: 'El tipo de servicio y el material son requeridos' 
        });
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
    } catch (error: any) {
      if (error.message.startsWith('RN6')) {
        return res.status(409).json({ error: true, message: error.message });
      }

      if (error.message.includes('No hay operarios disponibles')) {
        return res.status(409).json({ error: true, message: error.message });
      }
      
      if (error.message.includes('requerid') || error.message.includes('no encontrado')) {
        return res.status(400).json({ error: true, message: error.message });
      }

      console.error('Error creating order:', error);
      return res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }

  async findMyOrders(req: Request, res: Response): Promise<any> {
    try {
      const clientId = req.user.id as string;
      const orders = await ordersService.findByClientId(clientId);
      return res.status(200).json({ data: orders });
    } catch (error: any) {
      console.error('Error fetching my orders:', error);
      return res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }

  async findById(req: Request, res: Response): Promise<any> {
    try {
      const clientId = req.user.id as string;
      const id = req.params.id as string;

      const order = await ordersService.findById(id, clientId);

      if (!order) {
        return res.status(404).json({ error: true, message: 'Pedido no encontrado' });
      }

      return res.status(200).json({ data: order });
    } catch (error: any) {
      console.error('Error fetching order detail:', error);
      return res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }

  async uploadFile(req: Request, res: Response): Promise<any> {
    try {
      const clientId = req.user.id as string;
      const id = req.params.id as string;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: true, message: 'No se ha subido ningún archivo' });
      }

      // Determinar el tipo de archivo según la extensión
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
    } catch (error: any) {
      if (error.message.includes('permiso') || error.message.includes('encontrado')) {
        return res.status(404).json({ error: true, message: error.message });
      }
      console.error('Error uploading file:', error);
      return res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }

  async confirmBudget(req: Request, res: Response): Promise<any> {
    try {
      const clientId = req.user.id as string;
      const id = req.params.id as string;

      const order = await ordersService.confirmBudget(id, clientId);

      return res.status(200).json({ data: order });
    } catch (error: any) {
      if (error.message === 'Pedido no encontrado') {
        return res.status(404).json({ error: true, message: error.message });
      }
      if (error.message.includes('No se puede confirmar') || error.message.includes('expirado')) {
        return res.status(400).json({ error: true, message: error.message });
      }
      console.error('Error confirming budget:', error);
      return res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }

  async confirmPickup(req: Request, res: Response): Promise<any> {
    try {
      const clientId = req.user.id as string;
      const id = req.params.id as string;

      const order = await ordersService.confirmPickup(id, clientId);

      return res.status(200).json({ data: order });
    } catch (error: any) {
      if (error.message === 'Pedido no encontrado') {
        return res.status(404).json({ error: true, message: error.message });
      }
      if (error.message.includes('No se puede') || error.message.includes('estado')) {
        return res.status(400).json({ error: true, message: error.message });
      }
      console.error('Error confirming pickup:', error);
      return res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }

  async downloadOrderFile(req: Request, res: Response): Promise<any> {
    try {
      const clientId = req.user.id as string;
      const orderId = req.params.id as string;
      const fileId = req.params.fileId as string;

      if (!clientId) {
        return res.status(401).json({ error: true, message: 'Acceso no autorizado, token no proporcionado' });
      }

      const file = await ordersService.getDownloadableFile(clientId, orderId, fileId);
      res.download(file.absolutePath, file.originalFileName);
    } catch (error: any) {
      if (error.message === 'Ruta de archivo inválida') {
        return res.status(400).json({ error: true, message: error.message });
      }
      if (error.message === 'Pedido no encontrado' || error.message === 'Archivo no encontrado' || error.message === 'No tienes permiso para acceder a este archivo') {
        return res.status(404).json({ error: true, message: error.message });
      }
      console.error('Error downloading file:', error);
      return res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }

  async downloadPrimaryOrderFile(req: Request, res: Response): Promise<any> {
    try {
      const clientId = req.user.id as string;
      const orderId = req.params.id as string;

      if (!clientId) {
        return res.status(401).json({ error: true, message: 'Acceso no autorizado, token no proporcionado' });
      }

      const file = await ordersService.getPrimaryDownloadableFile(clientId, orderId);
      res.download(file.absolutePath, file.originalFileName);
    } catch (error: any) {
      if (error.message === 'Ruta de archivo inválida') {
        return res.status(400).json({ error: true, message: error.message });
      }
      if (error.message === 'Pedido no encontrado' || error.message === 'Archivo no encontrado' || error.message === 'No tienes permiso para acceder a este archivo') {
        return res.status(404).json({ error: true, message: error.message });
      }
      console.error('Error downloading primary file:', error);
      return res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }
}
