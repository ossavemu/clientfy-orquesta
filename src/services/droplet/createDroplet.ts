import axios, { AxiosError } from 'axios';
import { DO_API_URL, headers } from '../../config/digitalocean.js';
import type { Droplet } from '../../types';
import { retryWithDelay } from '../../utils/retryWithDelay.js';

export async function createDroplet(
  instanceName: string,
  numberphone: string,
  provider: string,
  userData: string
): Promise<Droplet> {
  try {
    console.log('Iniciando creación del droplet...');
    const createDropletResponse = await axios.post(
      `${DO_API_URL}/droplets`,
      {
        name: instanceName,
        region: 'sfo3',
        size: 's-1vcpu-512mb-10gb',
        image: 172586238,
        backups: false,
        ipv6: false,
        monitoring: true,
        tags: [numberphone, provider],
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
            timeout: 30000, // Aumentamos el timeout a 30 segundos
          }),
        3,
        5000
      );

      const droplet = dropletResponse.data.droplet;

      if (droplet?.status === 'active') {
        console.log('Droplet activo, iniciando espera de inicialización...');

        // Dividimos la espera en intervalos más pequeños
        const totalWaitTime = 120000; // 120 segundos en total
        const intervals = 12; // 12 intervalos de 10 segundos

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
        error instanceof Error ? error.message : 'Error desconocido',
        error instanceof AxiosError && error.response?.status
          ? `Status: ${error.response.status}`
          : ''
      );
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw new Error(
    `Timeout esperando que la instancia esté activa después de ${maxAttempts} intentos`
  );
}
