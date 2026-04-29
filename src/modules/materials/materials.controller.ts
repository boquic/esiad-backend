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
}
