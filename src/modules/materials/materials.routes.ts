import { Router } from 'express';
import { MaterialsController } from './materials.controller';

const router = Router();
const materialsController = new MaterialsController();

router.get('/', materialsController.findAll.bind(materialsController));

export default router;
