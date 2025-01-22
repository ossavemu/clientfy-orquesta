import { authMiddleware } from '@src/middleware/authMiddleware';
import { stateManager } from '@src/services/instanceStateManager';
import { Router, type RequestHandler } from 'express';

import type { ApiResponse, InstanceState } from '@src/types';

const router = Router();

const getInstanceStatus: RequestHandler<
  { numberphone: string },
  ApiResponse<InstanceState>
> = async (req, res, next): Promise<void> => {
  const { numberphone } = req.params;

  try {
    const instance = await stateManager.getInstance(numberphone);

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
