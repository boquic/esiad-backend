import { Router } from 'express';
import { OrdersController } from './orders.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';

const router = Router();
const ordersController = new OrdersController();

// Solo clientes pueden crear pedidos
router.post('/', authMiddleware, requireRole(['CLIENT']), ordersController.create.bind(ordersController));

export default router;
