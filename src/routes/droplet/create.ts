import { DO_API_URL, headers } from '@src/config/digitalocean';
import { authMiddleware } from '@src/middleware/authMiddleware';
import { router } from '@src/server';
import type { ApiResponse } from '@src/types';
import axios from 'axios';
import { type RequestHandler } from 'express';

interface CreateSimpleDropletBody {
  name: string;
  region?: string;
  size?: string;
}

interface SimpleDropletResponse {
  id: number;
  name: string;
  ip: string | null;
  status: string;
  message?: string;
}

interface DropletNetwork {
  type: string;
  ip_address?: string;
}

interface DropletResponse {
  id: number;
  name: string;
  networks: {
    v4: DropletNetwork[];
  };
  status: string;
  created_at: string;
}

const findExistingDroplet = async (
  name: string
): Promise<SimpleDropletResponse | null> => {
  try {
    const response = await axios.get<{ droplets: DropletResponse[] }>(
      `${DO_API_URL}/droplets`,
      {
        headers,
        timeout: 10000,
        params: {
          tag_name: 'simple-droplet',
        },
      }
    );

    const existingDroplet = response.data.droplets.find(
      (droplet: DropletResponse) => droplet.name === name
    );

    if (!existingDroplet) {
      return null;
    }

    const ipAddress =
      existingDroplet.networks.v4.find(
        (net: DropletNetwork) => net.type === 'public'
      )?.ip_address || null;

    return {
      id: existingDroplet.id,
      name: existingDroplet.name,
      ip: ipAddress,
      status: existingDroplet.status,
      message: ipAddress
        ? 'Droplet activo y con IP asignada'
        : 'Droplet en proceso de inicialización',
    };
  } catch (error) {
    console.error('Error al buscar droplet existente:', error);
    throw error;
  }
};

const getDropletInfo = async (
  dropletId: number
): Promise<SimpleDropletResponse> => {
  const response = await axios.get(`${DO_API_URL}/droplets/${dropletId}`, {
    headers,
    timeout: 10000,
  });

  const droplet = response.data.droplet;
  const ipAddress =
    droplet.networks.v4.find((net: DropletNetwork) => net.type === 'public')
      ?.ip_address || null;

  return {
    id: droplet.id,
    name: droplet.name,
    ip: ipAddress,
    status: droplet.status,
  };
};

const waitForDropletActive = async (
  dropletId: number
): Promise<SimpleDropletResponse> => {
  let attempts = 0;
  const maxAttempts = 10;
  const waitTime = 5000;

  while (attempts < maxAttempts) {
    try {
      const dropletInfo = await getDropletInfo(dropletId);
      if (dropletInfo.status === 'active' && dropletInfo.ip) {
        return dropletInfo;
      }
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    } catch (error) {
      attempts++;
      console.error(`Error en intento ${attempts}:`, error);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw new Error('Timeout esperando que el droplet esté activo y tenga IP');
};

const createSimpleDroplet: RequestHandler<
  {},
  ApiResponse<SimpleDropletResponse>,
  CreateSimpleDropletBody
> = async (req, res, next): Promise<void> => {
  try {
    const { name, region = 'sfo3', size = 's-1vcpu-512mb-10gb' } = req.body;

    if (!name) {
      res.status(400).json({
        success: false,
        error: 'El nombre del droplet es requerido',
      });
      return;
    }

    // Buscar droplet existente
    const existingDroplet = await findExistingDroplet(name);

    if (existingDroplet) {
      // Si existe y tiene IP, devolver la información
      if (existingDroplet.ip) {
        res.json({
          success: true,
          data: existingDroplet,
        });
        return;
      }

      // Si existe pero no tiene IP, está en proceso de creación
      if (
        existingDroplet.status === 'new' ||
        existingDroplet.status === 'active'
      ) {
        res.json({
          success: true,
          data: {
            ...existingDroplet,
            message:
              'Droplet en proceso de inicialización, intente nuevamente en unos segundos',
          },
        });
        return;
      }
    }

    // Script para configurar la contraseña root
    const userData = `#!/bin/bash
echo "root:${process.env.DIGITALOCEAN_SSH_PASSWORD}" | chpasswd
sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
systemctl restart sshd`;

    const createDropletResponse = await axios.post(
      `${DO_API_URL}/droplets`,
      {
        name,
        region,
        size,
        image: 'ubuntu-22-04-x64',
        backups: false,
        ipv6: false,
        monitoring: true,
        tags: ['simple-droplet'],
        user_data: userData,
      },
      {
        headers,
        timeout: 30000,
      }
    );

    const dropletId = createDropletResponse.data.droplet.id;

    res.json({
      success: true,
      data: {
        id: dropletId,
        name,
        ip: null,
        status: 'creating',
        message: 'Droplet creado, esperando asignación de IP',
      },
    });

    void (async () => {
      try {
        await waitForDropletActive(dropletId);
        console.log(
          `Droplet ${name} (ID: ${dropletId}) completamente inicializado`
        );
      } catch (error) {
        console.error(`Error en la inicialización del droplet ${name}:`, error);
      }
    })();
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error al crear droplet simple:', errorMessage);
    next(error);
  }
};

const getDropletStatus: RequestHandler = async (req, res, next) => {
  try {
    const dropletId = parseInt(req.params.id);
    const dropletInfo = await getDropletInfo(dropletId);

    res.json({
      success: true,
      data: dropletInfo,
    });
  } catch (error) {
    next(error);
  }
};

router.post('/droplet/create', authMiddleware, createSimpleDroplet);
router.get('/droplet/:id', authMiddleware, getDropletStatus);

export default router;
