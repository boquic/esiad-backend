import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export const errorHandlerMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // If it's a known AppError, send its status code and message
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: true,
      message: err.message,
    });
  }

  // Handle Prisma Errors if they leak
  if (err.name === 'PrismaClientKnownRequestError') {
    // We could map specific Prisma codes here
    // e.g. P2002 -> 409 Conflict
    const prismaErr = err as any;
    if (prismaErr.code === 'P2002') {
      return res.status(409).json({
        error: true,
        message: 'Registro duplicado',
      });
    }
  }

  // Log unhandled errors
  console.error('[Unhandled Error]', err);

  // Send generic 500 response
  return res.status(500).json({
    error: true,
    message: 'Error interno del servidor',
  });
};
