import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './modules/auth/auth.routes';
import servicesRoutes from './modules/services/services.routes';
import materialsRoutes from './modules/materials/materials.routes';
import ordersRoutes from './modules/orders/orders.routes';
import operatorsRoutes from './modules/operators/operators.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import adminRoutes from './modules/admin/admin.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import { ENV } from './config/env';
import { prisma, connectDatabase } from './config/database';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './docs/openapi';
import { startExpireBudgetsJob } from './jobs/expire-budgets.job';
import { startPickupReminderJob } from './jobs/pickup-reminder.job';
import { captureRequestTime, requestLogger, errorLogger } from './middlewares/logging.middleware';

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
// Deshabilitar ETag para evitar 304 Not Modified en desarrollo
app.disable('etag');
// Middleware de logging mejorado
app.use(captureRequestTime);
app.use(requestLogger);

app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/operator', operatorsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);

app.get('/api/openapi.json', (req: Request, res: Response) => {
  res.json(openApiSpec);
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));


app.get('/health', async (req: Request, res: Response) => {
  try {
    // Verificamos conexión a DB
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ error: true, message: 'Database disconnected' });
  }
});

// Middleware de error logging (debe estar al final)
app.use(errorLogger);

const startServer = async () => {
  await connectDatabase();
  startExpireBudgetsJob();
  startPickupReminderJob();
  app.listen(ENV.PORT, () => {
    console.log(`Server running on port ${ENV.PORT}`);
  });
};

startServer();
