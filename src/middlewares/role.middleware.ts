import { Role } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role) {
      res.status(401).json({ error: true, message: 'Acceso denegado, entorno de usuario no disponible' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: true, message: 'No tienes los permisos necesarios para realizar esta accion' });
      return;
    }

    next();
  };
};
