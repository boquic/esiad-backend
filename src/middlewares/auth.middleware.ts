import { Role } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

type AuthenticatedUser = JwtPayload & {
  id: string;
  role: Role;
  is_frequent: boolean;
};

declare global {
  namespace Express {
    interface Request {
      user: AuthenticatedUser;
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
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: true, message: 'Token invalido o expirado' });
  }
};
