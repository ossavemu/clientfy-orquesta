import axios from 'axios';
import express from 'express';
import { DO_API_URL, headers } from '../../config/digitalocean.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { getExistingDroplet } from '../../services/droplet/getExistingDroplet.js';
import { stateManager } from '../../services/instanceStateManager.js';

const router = express.Router();

router.post('/restart/:numberphone', authMiddleware, async (req, res) => {
  const { numberphone } = req.params;

  try {
    const droplet = await getExistingDroplet(numberphone);

    if (!droplet) {
      return res.status(404).json({
        error: 'No se encontró la instancia en DigitalOcean',
      });
    }

    // Reiniciar el droplet en DigitalOcean
    await axios.post(
      `${DO_API_URL}/droplets/${droplet.id}/actions`,
      {
        type: 'reboot',
      },
      { headers }
    );

    // Actualizar el estado en el gestor de estado
    stateManager.updateInstance(numberphone, {
      status: 'restarting',
      lastRestart: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: 'Reinicio de instancia iniciado',
      numberphone,
    });
  } catch (error) {
    console.error('Error reiniciando instancia:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
