import { NextFunction, Request, Response, Router } from 'express';
import { OrdersController } from './orders.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { buildUploadErrorResponse, uploadMiddleware } from '../../middlewares/upload.middleware';

const router = Router();
const ordersController = new OrdersController();

const handleOrderFileUpload = (req: Request, res: Response, next: NextFunction): void => {
  const upload = uploadMiddleware.single('file');

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

// Subir plano para un pedido
router.post('/:id/files', 
  authMiddleware, 
  requireRole(['CLIENT']), 
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

router.post('/:id/confirm-pickup',
  authMiddleware,
  requireRole(['CLIENT']),
  ordersController.confirmPickup.bind(ordersController)
);

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
