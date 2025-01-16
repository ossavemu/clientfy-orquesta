import axios from 'axios';
import type { RequestHandler } from 'express';
import express from 'express';
import { DO_API_URL, headers } from '../../config/digitalocean.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { getExistingDroplet } from '../../services/droplet/getExistingDroplet.js';
import { stateManager } from '../../services/instanceStateManager.js';
import type { ApiResponse } from '../../types';

const router = express.Router();

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
