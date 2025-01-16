import { DO_API_URL, headers } from '@src/config/digitalocean';
import { authMiddleware } from '@src/middleware/authMiddleware';
import { router } from '@src/server';
import { getExistingDroplet } from '@src/services/droplet/getExistingDroplet';
import { stateManager } from '@src/services/instanceStateManager';

import type { ApiResponse } from '@src/types';

import axios from 'axios';
import type { RequestHandler } from 'express';

const restartInstance: RequestHandler<
  { numberphone: string },
  ApiResponse<{ numberphone: string }>
> = async (req, res, next): Promise<void> => {
  const { numberphone } = req.params;

  try {
    const droplet = await getExistingDroplet(numberphone);

    if (!droplet) {
      res.status(404).json({
        success: false,
        error: 'No se encontró la instancia en DigitalOcean',
      });
      return;
    }

    await axios.post(
      `${DO_API_URL}/droplets/${droplet.id}/actions`,
      { type: 'reboot' },
      { headers }
    );

    stateManager.updateInstance(numberphone, {
      status: 'restarting',
      lastRestart: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Reinicio de instancia iniciado',
      data: { numberphone },
    });
  } catch (error: unknown) {
    next(error);
  }
};

router.post('/restart/:numberphone', authMiddleware, restartInstance);

export default router;
