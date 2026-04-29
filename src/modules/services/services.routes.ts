import { Router } from 'express';
import { ServicesController } from './services.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';

const router = Router();
const servicesController = new ServicesController();

router.get('/', servicesController.findAllActive.bind(servicesController));
router.post('/', authMiddleware, requireRole(['ADMIN']), servicesController.create.bind(servicesController));
router.patch('/:id', authMiddleware, requireRole(['ADMIN']), servicesController.update.bind(servicesController));

export default router;
