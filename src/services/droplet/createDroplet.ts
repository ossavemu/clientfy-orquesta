import { DO_API_URL, headers } from '@src/config/digitalocean';
import type { Droplet } from '@src/types';
import { retryWithDelay } from '@src/utils/retryWithDelay';

import axios from 'axios';

export async function createDroplet(
  instanceName: string,
  numberphone: string
): Promise<Droplet> {
  try {
    console.log('Iniciando creación del droplet...');

    const userData = `#!/bin/bash
# Configurar contraseña root
echo "root:${process.env.DIGITALOCEAN_SSH_PASSWORD}" | chpasswd
sed -i 's/PermitRootLogin no/PermitRootLogin yes/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config
systemctl restart sshd`;

    const createDropletResponse = await axios.post(
      `${DO_API_URL}/droplets`,
      {
        name: instanceName,
        region: 'sfo3',
        size: 's-1vcpu-512mb-10gb',
        image: 177031507,
        backups: false,
        ipv6: false,
        monitoring: true,
        tags: [numberphone],
        user_data: userData,
      },
      {
        headers,
        timeout: 30000,
      }
    );

    return createDropletResponse.data.droplet;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error al crear droplet:', errorMessage);
    throw error;
  }
}

export async function waitForDropletActive(
  dropletId: number,
  maxAttempts = 30
): Promise<Droplet> {
  console.log('Esperando que el droplet esté activo...');
  let attempts = 0;
  const waitTime = 10000; // 10 segundos entre intentos

  while (attempts < maxAttempts) {
    try {
      console.log(`Verificando estado... (${attempts + 1}/${maxAttempts})`);

      const dropletResponse = await retryWithDelay(
        () =>
          axios.get(`${DO_API_URL}/droplets/${dropletId}`, {
            headers,
            timeout: 30000,
          }),
        3,
        5000
      );

      const droplet = dropletResponse.data.droplet;

      if (droplet?.status === 'active') {
        console.log('Droplet activo, iniciando espera de inicialización...');

        // Reducimos el tiempo de espera a 1 minuto
        const totalWaitTime = 60000; // 60 segundos en total
        const intervals = 6; // 6 intervalos de 10 segundos

        for (let i = 1; i <= intervals; i++) {
          await new Promise((resolve) =>
            setTimeout(resolve, totalWaitTime / intervals)
          );
          console.log(
            `Esperando inicialización... ${
              i * (totalWaitTime / intervals / 1000)
            }/${totalWaitTime / 1000} segundos`
          );
        }

        return droplet;
      }

      attempts++;
      console.log(
        `Droplet aún no activo. Estado actual: ${
          droplet?.status || 'desconocido'
        }`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    } catch (error) {
      console.error(
        `Error al verificar estado (intento ${attempts + 1}):`,
        error instanceof Error ? error.message : 'Error desconocido'
      );
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw new Error(
    `Timeout esperando que la instancia esté activa después de ${maxAttempts} intentos`
  );
}
