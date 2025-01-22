import { authMiddleware } from '@src/middleware/authMiddleware';
import {
  createDroplet,
  waitForDropletActive,
} from '@src/services/droplet/createDroplet';
import { getExistingDroplet } from '@src/services/droplet/getExistingDroplet';
import { stateManager } from '@src/services/instanceStateManager';
import { initializeInstance } from '@src/services/ssh/initializeInstance';
import { waitForSSH } from '@src/services/ssh/waitForSSH';
import type { ApiResponse, CreateInstanceBody } from '@src/types';
import { Router, type RequestHandler } from 'express';

const router = Router();

const createInstance: RequestHandler<
  {},
  ApiResponse<{ numberphone: string; status: string }>,
  CreateInstanceBody
> = async (req, res, next): Promise<void> => {
  const {
    numberphone,
    provider = 'baileys',
    enableAppointments = false,
    enableAutoInvite = false,
  } = req.body;

  if (!numberphone) {
    res.status(400).json({
      success: false,
      error: 'numberphone es requerido',
    });
    return;
  }

  try {
    const existingDroplet = await getExistingDroplet(numberphone);

    if (existingDroplet) {
      stateManager.updateInstance(numberphone, {
        status: 'existing_in_digitalocean',
        instanceInfo: existingDroplet,
      });

      res.status(400).json({
        success: false,
        error: 'Ya existe una instancia en DigitalOcean para este número',
      });
      return;
    }

    // Crear instancia en el gestor de estado
    stateManager.createInstance(numberphone);

    // Iniciar proceso asíncrono de creación
    const instanceName = `bot-${numberphone}`;
    const userData = `#!/bin/bash
echo "Instance initialized"
echo "ENABLE_APPOINTMENTS=${enableAppointments}" >> /root/ClientFyAdmin/.env
echo "ENABLE_AUTO_INVITE=${enableAutoInvite}" >> /root/ClientFyAdmin/.env`;

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
          instanceInfo: {
            instanceName: droplet.name,
            ip:
              droplet.networks.v4.find((net) => net.type === 'public')
                ?.ip_address || null,
            state: droplet.status,
            created: droplet.created_at,
            numberphone,
            dropletId: droplet.id,
          },
        });

        // 2. Esperar que esté activo
        const activeDroplet = await waitForDropletActive(droplet.id);
        const ipAddress = activeDroplet.networks.v4.find(
          (net) => net.type === 'public'
        )?.ip_address;
        stateManager.updateInstance(numberphone, {
          status: 'waiting_for_ssh',
          progress: 50,
          instanceInfo: {
            instanceName: activeDroplet.name,
            ip: ipAddress || null,
            state: activeDroplet.status,
            created: activeDroplet.created_at,
            numberphone,
            dropletId: activeDroplet.id,
          },
        });

        // 3. Esperar conexión SSH
        if (!ipAddress) {
          throw new Error('No se pudo obtener la IP de la instancia');
        }

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
          status: 'failed',
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    })().catch((error) => {
      console.error('Error en el proceso asíncrono:', error);
    });

    res.json({
      success: true,
      data: {
        numberphone,
        status: 'creating',
      },
    });
  } catch (error: unknown) {
    next(error);
  }
};

router.post('/create', authMiddleware, createInstance);

export default router;
