import axios from 'axios';
import express from 'express';
import { DO_API_URL, headers } from '../../config/digitalocean.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { getExistingDroplet } from '../../services/droplet/getExistingDroplet.js';
import { stateManager } from '../../services/instanceStateManager.js';

const router = express.Router();

router.delete('/delete/:numberphone', authMiddleware, async (req, res) => {
  const { numberphone } = req.params;

  try {
    const droplet = await getExistingDroplet(numberphone);

    if (!droplet) {
      return res.status(404).json({
        error: 'No se encontró la instancia en DigitalOcean',
      });
    }

    // Eliminar el droplet de DigitalOcean
    await axios.delete(`${DO_API_URL}/droplets/${droplet.id}`, { headers });

    // Actualizar el estado en el gestor de estado
    stateManager.updateInstance(numberphone, {
      status: 'deleted',
      deletedAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: 'Instancia eliminada correctamente',
      numberphone,
    });
  } catch (error) {
    console.error('Error eliminando instancia:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
