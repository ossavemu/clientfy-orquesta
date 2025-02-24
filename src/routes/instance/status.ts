import { authMiddleware } from '@src/middleware/authMiddleware';
import { getExistingDroplet } from '@src/services/droplet/getExistingDroplet';
import { stateManager } from '@src/services/instanceStateManager';
import type { ApiResponse, DODroplet, InstanceState } from '@src/types';
import { Router, type RequestHandler } from 'express';

const router = Router();

const getInstanceStatus: RequestHandler<
  { numberphone: string },
  ApiResponse<InstanceState>
> = async (req, res, next): Promise<void> => {
  const { numberphone } = req.params;

  try {
    const instance = await stateManager.getInstance(numberphone);

    // Verificar si la instancia existe en DigitalOcean y tiene IP
    const droplet = await getExistingDroplet(numberphone);
    const dropletHasIp = droplet?.networks?.v4?.some(
      (net: DODroplet['networks']['v4'][0]) =>
        net.type === 'public' && net.ip_address
    );
    const dropletExists = droplet && dropletHasIp;

    // Si no existe en DO o no tiene IP, pero tenemos un estado, reiniciamos el estado
    if (!dropletExists && instance && instance.status !== 'creating') {
      await stateManager.createInstance(numberphone);
      res.json({
        success: true,
        data: {
          status: 'creating',
          progress: 0,
          error: null,
          instanceInfo: null,
        },
      });
      return;
    }

    // Si no existe ni en DO ni en nuestro estado
    if (!instance) {
      res.status(404).json({
        success: false,
        error: 'Instancia no encontrada',
      });
      return;
    }

    res.json({
      success: true,
      data: instance,
    });
  } catch (error: unknown) {
    next(error);
  }
};

router.get('/status/:numberphone', authMiddleware, getInstanceStatus);

export default router;
