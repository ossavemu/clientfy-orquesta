import type { RequestHandler } from 'express';

export const authMiddleware: RequestHandler = (req, res, next): void => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.SECRET_KEY) {
    res.status(401).json({
      success: false,
      error: 'Acceso no autorizado. Se requiere una clave API válida.',
    });
    return;
  }

  next();
};
