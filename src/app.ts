import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './modules/auth/auth.routes';
import { ENV } from './config/env';
import { prisma, connectDatabase } from './config/database';
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

app.get('/api/docs', (req: Request, res: Response) => {
  res.type('html').send(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ESIAD API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #0f172a; }
      .swagger-ui .topbar { display: none; }
      .swagger-ui { background: white; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = function () {
        window.ui = SwaggerUIBundle({
          url: '/api/openapi.json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis],
          layout: 'BaseLayout'
        });
      };
    </script>
  </body>
</html>`);
});

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
