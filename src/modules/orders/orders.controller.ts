import { Request, Response } from 'express';
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
}
