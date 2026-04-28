import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

// Extendemos globalmente la interfaz Request de Express para inyectar el usuario
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: true, message: 'Acceso no autorizado, token no proporcionado' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    req.user = decoded; // Inyectamos el payload del token (id, role, is_frequent) en el objeto request
    next();
  } catch (error) {
    res.status(401).json({ error: true, message: 'Token inválido o expirado' });
  }
};
