import { Router } from 'express';
import { adminController } from './admin.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';

const router = Router();

router.use(authMiddleware, requireRole(['ADMIN']));

router.get('/payments/pending', adminController.getPendingPayments);
router.patch('/payments/:id/approve', adminController.approvePayment);
router.patch('/payments/:id/reject', adminController.rejectPayment);
router.patch('/orders/:id/assign', adminController.assignOperator);

router.get('/stats/sales', adminController.getSalesStats);
router.get('/stats/services', adminController.getServicesStats);
router.get('/stats/clients', adminController.getTopClients);
router.get('/stats/operators', adminController.getOperatorsStats);
router.get('/stats/orders-by-status', adminController.getOrdersByStatusStats);

router.get('/orders', adminController.getAdminOrders);
router.get('/reports/orders/export', adminController.exportOrdersReport);
router.get('/clients', adminController.getClients);
router.patch('/clients/:id/frequent', adminController.updateClientFrequentStatus);

router.post('/operators', adminController.createOperator);
router.patch('/operators/:id', adminController.updateOperator);
router.delete('/operators/:id', adminController.deleteOperator);

export default router;
