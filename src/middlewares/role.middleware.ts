import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para proteger rutas basado en los roles permitidos.
 * Debe ser ejecutado **despus** del `auth.middleware` para garantizar
 * que el objeto `req.user` est inyectado.
 * 
 * @param allowedRoles Lista de roles que tienen acceso (ej. ['ADMIN', 'OPERATOR'])
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Verificamos si el usuario fue autenticado exitosamente previamente
    if (!req.user || !req.user.role) {
      res.status(401).json({ error: true, message: 'Acceso denegado, entorno de usuario no disponible' });
      return;
    }

    // Validamos que su rol est dentro del arreglo permitido
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: true, message: 'No tienes los permisos necesarios para realizar esta accin' });
      return;
    }

    // El usario tiene permisos correctos, concedemos el pase al enrutador
    next();
  };
};
