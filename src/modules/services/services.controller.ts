import { PricingModel } from '@prisma/client';
import { Request, Response } from 'express';
import { ServicesService } from './services.service';

const servicesService = new ServicesService();

function isPricingModel(value: unknown): value is PricingModel {
  return typeof value === 'string' && ['FIXED', 'PER_M2', 'PER_UNIT', 'PER_VOLUME'].includes(value);
}

export class ServicesController {
  async findAllActive(req: Request, res: Response): Promise<any> {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const services = await servicesService.findAllActive(includeInactive);
      return res.status(200).json({ data: services, total: services.length });
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

      if (!isPricingModel(pricing_model)) {
        return res.status(400).json({ error: true, message: 'El modelo de precios no es valido' });
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
      const id = req.params.id as string;
      const { name, pricing_model, is_active } = req.body;

      if (pricing_model !== undefined && !isPricingModel(pricing_model)) {
        return res.status(400).json({ error: true, message: 'El modelo de precios no es valido' });
      }

      const service = await servicesService.update(id, { name, pricing_model, is_active });
      return res.status(200).json({ data: service });
    } catch (error: any) {
      if (error.message === 'Servicio ya registrado') {
        return res.status(409).json({ error: true, message: error.message });
      }
      if (error.message === 'Servicio no encontrado' || error.code === 'P2025') {
        return res.status(404).json({ error: true, message: 'Servicio no encontrado' });
      }
      return res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }

  async toggle(req: Request, res: Response): Promise<any> {
    try {
      const id = req.params.id as string;
      const service = await servicesService.toggle(id);
      return res.status(200).json({ data: service });
    } catch (error: any) {
      if (error.message === 'Servicio no encontrado' || error.code === 'P2025') {
        return res.status(404).json({ error: true, message: 'Servicio no encontrado' });
      }
      return res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }
}
