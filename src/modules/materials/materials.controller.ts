import { Request, Response } from 'express';
import { MaterialsService } from './materials.service';

const materialsService = new MaterialsService();

function isValidUnitPrice(value: unknown): boolean {
  if (value === null || value === undefined || value === '') {
    return false;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

export class MaterialsController {
  async findAll(req: Request, res: Response): Promise<any> {
    try {
      const { serviceTypeId } = req.query;
      const includeInactive = req.query.includeInactive === 'true';
      const materials = await materialsService.findAll(serviceTypeId as string, includeInactive);
      return res.status(200).json({ data: materials, total: materials.length });
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

      if (!isValidUnitPrice(unit_price)) {
        return res.status(400).json({ error: true, message: 'El precio unitario no es valido' });
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

  async update(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { name, unit_price, unit, is_active } = req.body;

      if (unit_price !== undefined && !isValidUnitPrice(unit_price)) {
        return res.status(400).json({ error: true, message: 'El precio unitario no es valido' });
      }

      const material = await materialsService.update(id as string, { name, unit_price, unit, is_active });
      return res.status(200).json({ data: material });
    } catch (error: any) {
      if (error.message === 'Material no encontrado' || error.code === 'P2025') {
        return res.status(404).json({ error: true, message: 'Material no encontrado' });
      }
      if (error.message === 'El material ya existe para este tipo de servicio') {
        return res.status(409).json({ error: true, message: error.message });
      }
      return res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }

  async toggle(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const material = await materialsService.toggle(id as string);
      return res.status(200).json({ data: material });
    } catch (error: any) {
      if (error.message === 'Material no encontrado' || error.code === 'P2025') {
        return res.status(404).json({ error: true, message: 'Material no encontrado' });
      }
      return res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }

  async remove(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const material = await materialsService.delete(id as string);
      return res.status(200).json({ data: material });
    } catch (error: any) {
      if (error.message === 'Material no encontrado' || error.code === 'P2025') {
        return res.status(404).json({ error: true, message: 'Material no encontrado' });
      }

      if (error.code === 'P2003') {
        return res.status(409).json({
          error: true,
          message: 'No se puede eliminar el material porque tiene pedidos asociados'
        });
      }

      return res.status(500).json({ error: true, message: 'Error interno del servidor' });
    }
  }
}
