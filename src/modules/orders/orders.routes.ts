import { Router } from 'express';
import { OrdersController } from './orders.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { uploadMiddleware } from '../../middlewares/upload.middleware';

const router = Router();
const ordersController = new OrdersController();

// Solo clientes pueden crear pedidos
router.post('/', authMiddleware, requireRole(['CLIENT']), ordersController.create.bind(ordersController));

// Listar pedidos del cliente autenticado
router.get('/my', authMiddleware, requireRole(['CLIENT']), ordersController.findMyOrders.bind(ordersController));

// Ver detalle de un pedido
router.get('/:id', authMiddleware, requireRole(['CLIENT']), ordersController.findById.bind(ordersController));

// Subir plano para un pedido
router.post('/:id/files', 
  authMiddleware, 
  requireRole(['CLIENT']), 
  uploadMiddleware.single('file'), 
  ordersController.uploadFile.bind(ordersController)
);

// Confirmar presupuesto
router.post('/:id/confirm', 
  authMiddleware, 
  requireRole(['CLIENT']), 
  ordersController.confirmBudget.bind(ordersController)
);

export default router;
