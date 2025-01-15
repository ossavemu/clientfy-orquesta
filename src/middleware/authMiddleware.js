export const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.SECRET_KEY) {
    return res.status(401).json({
      error: 'Acceso no autorizado. Se requiere una clave API válida.',
    });
  }

  next();
};
