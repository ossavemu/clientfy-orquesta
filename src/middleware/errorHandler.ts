import type { NextFunction, Request, Response } from 'express';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);

  if (!res.headersSent) {
    return res.status(500).json({
      success: false,
      error:
        process.env.NODE_ENV === 'production'
          ? 'Error interno del servidor'
          : err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }

  next(err);
}
