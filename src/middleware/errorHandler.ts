import type { Request, Response } from 'express';

export function errorHandler(err: Error, req: Request, res: Response) {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}
