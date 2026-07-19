import { NextFunction, Request, Response, Router } from 'express';
import { OrdersController } from './orders.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { buildUploadErrorResponse, uploadDwgOnlyMiddleware, uploadMiddleware } from '../../middlewares/upload.middleware';
import { prisma } from '../../config/database';
import { mapPricingModelToSpecialty } from '../../utils/order.utils';

const router = Router();
const ordersController = new OrdersController();

// Determina si el pedido corresponde al servicio de corte láser (RN: solo .dwg para láser)
const resolveOrderUploadPolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const clientId = req.user.id as string;
    const orderId = req.params.id as string;

    const order = await prisma.order.findFirst({
      where: { id: orderId, client_id: clientId },
      include: { service_type: true }
    });

    if (!order) {
      res.status(404).json({ error: true, message: 'Pedido no encontrado' });
      return;
    }

    const isLaserOrder = mapPricingModelToSpecialty(order.service_type.pricing_model) === 'LASER';
    (req as Request & { isLaserOrder?: boolean }).isLaserOrder = isLaserOrder;
    next();
  } catch (error) {
    next(error);
  }
};

const handleOrderFileUpload = (req: Request, res: Response, next: NextFunction): void => {
  const isLaserOrder = (req as Request & { isLaserOrder?: boolean }).isLaserOrder === true;
  const upload = (isLaserOrder ? uploadDwgOnlyMiddleware : uploadMiddleware).single('file');

  upload(req, res, (error: unknown) => {
    const uploadError = buildUploadErrorResponse(error);

    if (uploadError) {
      res.status(uploadError.status).json({ error: true, message: uploadError.message });
      return;
    }

    next();
  });
};

// Solo clientes pueden crear pedidos
router.post('/', authMiddleware, requireRole(['CLIENT']), ordersController.create.bind(ordersController));

// Listar pedidos del cliente autenticado
router.get('/my', authMiddleware, requireRole(['CLIENT']), ordersController.findMyOrders.bind(ordersController));

// Ver detalle de un pedido
router.get('/:id', authMiddleware, requireRole(['CLIENT']), ordersController.findById.bind(ordersController));

// Editar un borrador (solo estado DRAFT y solo el dueño del pedido)
router.patch('/:id', authMiddleware, requireRole(['CLIENT']), ordersController.update.bind(ordersController));

// Eliminar un borrador (solo estado DRAFT y solo el dueño del pedido)
router.delete('/:id', authMiddleware, requireRole(['CLIENT']), ordersController.remove.bind(ordersController));

// Enviar el borrador: DRAFT -> BUDGETED (legado, ver nota en OrdersService.submitDraft)
router.post('/:id/submit',
  authMiddleware,
  requireRole(['CLIENT']),
  ordersController.submitDraft.bind(ordersController)
);

// Enviar el borrador a cotización del operario: DRAFT -> OPERATOR_REVIEW_PENDING (HU-03)
router.post('/:id/send-to-quotation',
  authMiddleware,
  requireRole(['CLIENT']),
  ordersController.sendToQuotation.bind(ordersController)
);

// Subir plano para un pedido
router.post('/:id/files',
  authMiddleware,
  requireRole(['CLIENT']),
  resolveOrderUploadPolicy,
  handleOrderFileUpload,
  ordersController.uploadFile.bind(ordersController)
);

// Confirmar presupuesto
router.post('/:id/confirm', 
  authMiddleware, 
  requireRole(['CLIENT']), 
  ordersController.confirmBudget.bind(ordersController)
);

// Confirmar recogida por parte del cliente (doble validación)
router.post('/:id/confirm-review',
  authMiddleware,
  requireRole(['CLIENT']),
  ordersController.confirmReview.bind(ordersController)
);

router.post('/:id/observations',
  authMiddleware,
  requireRole(['CLIENT']),
  ordersController.addObservation.bind(ordersController)
);

// Confirmar recogida: movido al operario (POST /api/operator/orders/:id/confirm-pickup). El cliente ya no confirma nada.

// Descarga protegida de archivos (solo cliente propietario)
router.get('/:id/file',
  authMiddleware,
  requireRole(['CLIENT']),
  ordersController.downloadPrimaryOrderFile.bind(ordersController)
);

router.get('/:id/files/:fileId/download',
  authMiddleware,
  requireRole(['CLIENT']),
  ordersController.downloadOrderFile.bind(ordersController)
);

export default router;
