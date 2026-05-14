import { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';

// Extender Request para almacenar info de logging
declare global {
  namespace Express {
    interface Request {
      requestTime?: number;
      requestId?: string;
      responseStatus?: number;
      responseBody?: any;
    }
  }
}

// Token personalizado para morgan que muestra más detalles
morgan.token('response-details', (req: Request) => {
  if (req.responseStatus && req.responseStatus >= 400) {
    // Para errores, mostrar el mensaje
    const errorMsg = req.responseBody?.message || req.responseBody?.error || 'Error desconocido';
    return `❌ ${errorMsg}`;
  }
  
  // Para éxitos, mostrar el tamaño o cantidad de datos
  if (req.responseBody) {
    if (Array.isArray(req.responseBody.data)) {
      return `✅ ${req.responseBody.data.length} items (${JSON.stringify(req.responseBody).length} bytes)`;
    }
    if (req.responseBody.data) {
      return `✅ OK (${JSON.stringify(req.responseBody).length} bytes)`;
    }
    if (req.responseBody.status === 'ok') {
      return `✅ Health OK`;
    }
  }
  return '';
});

morgan.token('user-info', (req: Request) => {
  if (req.user?.id) {
    return `[USER:${req.user.id.slice(0, 8)}]`;
  }
  return '[ANON]';
});

morgan.token('response-time-ms', (req: Request) => {
  if (req.requestTime) {
    return `${(Date.now() - req.requestTime).toFixed(3)}ms`;
  }
  return '-';
});

// Formato personalizado para morgan
const customFormat = ':method :url :status :response-time-ms :user-info :response-details';

// Middleware para capturar el tiempo de inicio de request
export const captureRequestTime = (req: Request, res: Response, next: NextFunction) => {
  req.requestTime = Date.now();
  req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Interceptar res.json() para capturar el body
  const originalJson = res.json.bind(res);
  res.json = function(body: any) {
    req.responseBody = body;
    req.responseStatus = res.statusCode;
    return originalJson(body);
  };

  // Interceptar res.send() también (para strings/buffers)
  const originalSend = res.send.bind(res);
  res.send = function(body: any) {
    if (typeof body === 'string' || Buffer.isBuffer(body)) {
      req.responseBody = body;
    }
    req.responseStatus = res.statusCode;
    return originalSend(body);
  };

  // Interceptar status() para capturar cambios de status
  const originalStatus = res.status.bind(res);
  res.status = function(code: number) {
    req.responseStatus = code;
    return originalStatus(code);
  };

  next();
};

// Crear instancia de morgan con formato personalizado
export const requestLogger = morgan(customFormat, {
  skip: (req: Request) => {
    // Omitir logs de healthcheck
    return req.path === '/health';
  }
});

// Middleware de error logging
export const errorLogger = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error({
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    statusCode: res.statusCode,
    error: {
      message: err.message,
      stack: err.stack,
      code: err.code,
      details: err.details || null
    },
    requestBody: req.body,
    query: req.query
  });

  next(err);
};
