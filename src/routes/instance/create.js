import express from 'express';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import {
  createDroplet,
  waitForDropletActive,
} from '../../services/droplet/createDroplet.js';
import { getExistingDroplet } from '../../services/droplet/getExistingDroplet.js';
import { stateManager } from '../../services/instanceStateManager.js';
import { initializeInstance } from '../../services/ssh/initializeInstance.js';
import { waitForSSH } from '../../services/ssh/waitForSSH.js';

const router = express.Router();

router.post('/create', authMiddleware, async (req, res) => {
  const { numberphone, provider = 'baileys' } = req.body;

  if (!numberphone) {
    return res.status(400).json({ error: 'numberphone es requerido' });
  }

  try {
    const existingDroplet = await getExistingDroplet(numberphone);

    if (existingDroplet) {
      stateManager.updateInstance(numberphone, {
        status: 'existing_in_digitalocean',
        instanceInfo: existingDroplet,
      });

      return res.status(400).json({
        error: 'Ya existe una instancia en DigitalOcean para este número',
      });
    }

    // Crear instancia en el gestor de estado
    stateManager.createInstance(numberphone);

    // Iniciar proceso asíncrono de creación
    const instanceName = `bot-${numberphone}`;
    const userData = '#!/bin/bash\necho "Instance initialized"';

    // Proceso asíncrono
    (async () => {
      try {
        // 1. Crear droplet
        const droplet = await createDroplet(
          instanceName,
          numberphone,
          provider,
          userData
        );
        stateManager.updateInstance(numberphone, {
          status: 'creating_droplet',
          progress: 25,
          instanceInfo: droplet,
        });

        // 2. Esperar que esté activo
        const activeDroplet = await waitForDropletActive(droplet.id);
        const ipAddress = activeDroplet.networks.v4.find(
          (net) => net.type === 'public'
        )?.ip_address;
        stateManager.updateInstance(numberphone, {
          status: 'waiting_for_ssh',
          progress: 50,
          instanceInfo: { ...activeDroplet, ip: ipAddress },
        });

        // 3. Esperar conexión SSH
        const sshReady = await waitForSSH(ipAddress);
        if (!sshReady) {
          throw new Error('No se pudo establecer conexión SSH');
        }
        stateManager.updateInstance(numberphone, {
          status: 'initializing',
          progress: 75,
        });

        // 4. Inicializar instancia
        await initializeInstance(ipAddress);
        stateManager.updateInstance(numberphone, {
          status: 'completed',
          progress: 100,
        });
      } catch (error) {
        console.error('Error en el proceso de creación:', error);
        stateManager.updateInstance(numberphone, {
          status: 'error',
          error: error.message,
        });
      }
    })().catch((error) => {
      console.error('Error en el proceso asíncrono:', error);
    });

    return res.json({
      success: true,
      numberphone,
      status: 'creating',
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;
