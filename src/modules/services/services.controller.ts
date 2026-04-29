import { Request, Response } from 'express';
import { ServicesService } from './services.service';

const servicesService = new ServicesService();

export class ServicesController {
  async findAllActive(req: Request, res: Response): Promise<any> {
    try {
      const services = await servicesService.findAllActive();
      return res.status(200).json({ data: services });
    } catch (error: any) {
      return res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }

  async create(req: Request, res: Response): Promise<any> {
    try {
      const { name, pricing_model } = req.body;

      if (!name || !pricing_model) {
        return res.status(400).json({ error: true, message: 'El nombre y el modelo de precios son requeridos' });
      }

      const service = await servicesService.create({ name, pricing_model });
      return res.status(201).json({ data: service });
    } catch (error: any) {
      if (error.message === 'Servicio ya registrado') {
        return res.status(409).json({ error: true, message: error.message });
      }
      return res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }

  async update(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { name, pricing_model, is_active } = req.body;

      const service = await servicesService.update(id, { name, pricing_model, is_active });
      return res.status(200).json({ data: service });
    } catch (error: any) {
      if (error.message === 'Servicio ya registrado') {
        return res.status(409).json({ error: true, message: error.message });
      }
      if (error.code === 'P2025') {
        return res.status(404).json({ error: true, message: 'Servicio no encontrado' });
      }
      return res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }
}
