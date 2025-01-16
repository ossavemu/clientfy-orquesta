import axios from 'axios';
import type { RequestHandler } from 'express';
import express from 'express';
import { DO_API_URL, headers } from '../../config/digitalocean';
import { authMiddleware } from '../../middleware/authMiddleware';
import { getExistingDroplet } from '../../services/droplet/getExistingDroplet';
import { stateManager } from '../../services/instanceStateManager';
import type { ApiResponse } from '../../types';

const router = express.Router();

const deleteInstance: RequestHandler<
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

    await axios.delete(`${DO_API_URL}/droplets/${droplet.id}`, { headers });

    stateManager.updateInstance(numberphone, {
      status: 'deleted',
      deletedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Instancia eliminada correctamente',
      data: { numberphone },
    });
  } catch (error: unknown) {
    next(error);
  }
};

router.delete('/delete/:numberphone', authMiddleware, deleteInstance);

export default router;
