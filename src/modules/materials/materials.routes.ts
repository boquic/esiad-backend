import { Router } from 'express';
import { MaterialsController } from './materials.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';

const router = Router();
const materialsController = new MaterialsController();

router.get('/', materialsController.findAll.bind(materialsController));
router.post('/', authMiddleware, requireRole(['ADMIN']), materialsController.create.bind(materialsController));
router.patch('/:id', authMiddleware, requireRole(['ADMIN']), materialsController.update.bind(materialsController));

export default router;
