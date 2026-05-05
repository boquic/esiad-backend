import { Request, Response } from 'express';
import path from 'path';
import { OrdersService } from './orders.service';

const ordersService = new OrdersService();

export class OrdersController {
  async create(req: Request, res: Response): Promise<any> {
    try {
      const clientId = req.user.id;
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
      
      if (error.message.includes('requerid') || error.message.includes('no encontrado')) {
        return res.status(400).json({ error: true, message: error.message });
      }

      console.error('Error creating order:', error);
      return res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }

  async findMyOrders(req: Request, res: Response): Promise<any> {
    try {
      const clientId = req.user.id;
      const orders = await ordersService.findByClientId(clientId);
      return res.status(200).json({ data: orders });
    } catch (error: any) {
      console.error('Error fetching my orders:', error);
      return res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }

  async findById(req: Request, res: Response): Promise<any> {
    try {
      const clientId = req.user.id;
      const { id } = req.params;

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
      const clientId = req.user.id;
      const { id } = req.params;
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
      const clientId = req.user.id;
      const { id } = req.params;

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
}
