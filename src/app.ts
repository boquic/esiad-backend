import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './modules/auth/auth.routes';
import { ENV } from './config/env';
import { prisma, connectDatabase } from './config/database';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './docs/openapi';

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);

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

const startServer = async () => {
  await connectDatabase();
  app.listen(ENV.PORT, () => {
    console.log(`Server running on port ${ENV.PORT}`);
  });
};

startServer();
