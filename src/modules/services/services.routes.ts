import { Router } from 'express';
import { ServicesController } from './services.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';

const router = Router();
const servicesController = new ServicesController();

const requireAdminWhenAll = (req: any, res: any, next: any) => {
	if (req.query.all === 'true') {
		return authMiddleware(req, res, () => requireRole(['ADMIN'])(req, res, next));
	}
	return next();
};

router.get('/', requireAdminWhenAll, servicesController.findAllActive.bind(servicesController));
router.post('/', authMiddleware, requireRole(['ADMIN']), servicesController.create.bind(servicesController));
router.patch('/:id', authMiddleware, requireRole(['ADMIN']), servicesController.update.bind(servicesController));
router.patch('/:id/toggle', authMiddleware, requireRole(['ADMIN']), servicesController.toggle.bind(servicesController));
router.delete('/:id', authMiddleware, requireRole(['ADMIN']), servicesController.remove.bind(servicesController));

export default router;
