import { DO_API_URL, headers } from '@src/config/digitalocean';
import { retryWithDelay } from '@src/utils/retryWithDelay';

import axios from 'axios';

export async function getExistingDroplet(numberphone: string) {
  return retryWithDelay(async () => {
    try {
      const response = await axios.get(
        `${DO_API_URL}/droplets?tag_name=${numberphone}`,
        {
          headers,
          timeout: 10000,
        }
      );
      console.log(response.data.droplets[0]);
      return response.data.droplets[0] || null;
    } catch (error) {
      console.error('Error al verificar droplet existente:', error);
      return null;
    }
  }, 3);
}
