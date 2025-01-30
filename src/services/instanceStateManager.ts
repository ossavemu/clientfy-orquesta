import { DO_API_URL, headers } from '@src/config/digitalocean';
import { getExistingDroplet } from '@src/services/droplet/getExistingDroplet';
import type { InstanceInfo, InstanceState } from '@src/types';
import axios from 'axios';

const InstanceStatus = {
  CREATING: 'creating',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DELETED: 'deleted',
} as const;

export class InstanceStateManager {
  private instances: Map<string, InstanceState>;

  constructor() {
    this.instances = new Map<string, InstanceState>();
  }

  async createInstance(numberphone: string): Promise<void> {
    if (this.instances.has(numberphone)) {
      const existingDroplet = await getExistingDroplet(numberphone);
      
      if (existingDroplet) {
        try {
          await axios.delete(`${DO_API_URL}/droplets/${existingDroplet.id}`, { headers });
          console.log('Instancia anterior eliminada exitosamente de DigitalOcean');
          
          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error) {
          console.error('Error al eliminar instancia existente:', error);
          throw new Error('Error al eliminar la instancia existente en DigitalOcean');
        }
      }
      
      this.instances.delete(numberphone);
    }

    // Crear nueva instancia en memoria con el formato correcto
    this.instances.set(numberphone, {
      status: InstanceStatus.CREATING,
      progress: 0,
      createdAt: new Date().toISOString(),
      error: null,
      instanceInfo: null
    });
  }

  async getInstance(numberphone: string): Promise<InstanceState | null> {
    let instance = this.instances.get(numberphone);

    if (!instance) {
      const existingDroplet = await getExistingDroplet(numberphone);
      if (existingDroplet) {
        const ipAddress =
          existingDroplet.networks.v4.find(
            (network: { type: string }) => network.type === 'public'
          )?.ip_address || null;

        const instanceInfo: InstanceInfo = {
          instanceName: `bot-${numberphone}`,
          ip: ipAddress,
          state: existingDroplet.status,
          created: existingDroplet.created_at,
          numberphone,
          dropletId: existingDroplet.id,
        };

        instance = {
          status: InstanceStatus.COMPLETED,
          progress: 100,
          error: null,
          instanceInfo,
          createdAt: existingDroplet.created_at
        };

        this.instances.set(numberphone, instance);
      }
    }

    return instance || null;
  }

  updateInstance(numberphone: string, data: Partial<InstanceState>): void {
    const instance = this.instances.get(numberphone);
    if (instance) {
      this.instances.set(numberphone, { 
        ...instance, 
        ...data,
        // Asegurarse de que el status sea uno válido
        status: data.status || instance.status
      });
    }
  }

  deleteInstance(numberphone: string): void {
    this.instances.delete(numberphone);
  }
}

export const stateManager = new InstanceStateManager();
