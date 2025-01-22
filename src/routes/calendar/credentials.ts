import { authMiddleware } from '@src/middleware/authMiddleware';
import { getRedisClient } from '@src/services/redis/redisService';
import { Router, type Request, type Response } from 'express';

const router = Router();

router.get(
  '/credentials',
  authMiddleware,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const redis = await getRedisClient();
      const credentials = await redis.get('CALENDAR_CREDENTIALS');

      if (!credentials) {
        res.status(404).json({
          success: false,
          message: 'Credenciales no encontradas',
        });
        return;
      }

      // Parsear las credenciales para asegurar que son JSON válido
      const parsedCredentials = JSON.parse(credentials);

      res.json({
        success: true,
        data: parsedCredentials,
      });
    } catch (error) {
      console.error('Error al obtener credenciales:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las credenciales',
      });
    }
  }
);

export default router;
