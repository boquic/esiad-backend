import { Request, Response } from 'express';
import { MaterialsService } from './materials.service';

const materialsService = new MaterialsService();

export class MaterialsController {
  async findAll(req: Request, res: Response): Promise<any> {
    try {
      const { serviceTypeId } = req.query;
      const materials = await materialsService.findAll(serviceTypeId as string);
      return res.status(200).json({ data: materials });
    } catch (error: any) {
      return res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }

  async create(req: Request, res: Response): Promise<any> {
    try {
      const { service_type_id, name, unit_price, unit } = req.body;

      if (!service_type_id || !name || unit_price === undefined || !unit) {
        return res.status(400).json({ error: true, message: 'Todos los campos son requeridos' });
      }

      const material = await materialsService.create({ service_type_id, name, unit_price, unit });
      return res.status(201).json({ data: material });
    } catch (error: any) {
      if (error.message === 'Tipo de servicio no encontrado') {
        return res.status(404).json({ error: true, message: error.message });
      }
      if (error.message === 'El material ya existe para este tipo de servicio') {
        return res.status(409).json({ error: true, message: error.message });
      }
      return res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }
}
