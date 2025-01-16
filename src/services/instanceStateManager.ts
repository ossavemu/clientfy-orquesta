import { getExistingDroplet } from '@src/services/droplet/getExistingDroplet';
import type { InstanceInfo, InstanceState } from '@src/types';

const InstanceStatus = {
  CREATING: 'creating',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DELETED: 'deleted',
} as const;

class InstanceStateManager {
  instances: Map<string, InstanceState>;

  constructor() {
    this.instances = new Map<string, InstanceState>();
  }

  createInstance(numberphone: string): void {
    if (this.instances.has(numberphone)) {
      throw new Error('Ya existe una instancia para este número');
    }

    const initialState: InstanceState = {
      status: InstanceStatus.CREATING,
      progress: 0,
      error: null,
      instanceInfo: null,
    };

    this.instances.set(numberphone, initialState);
  }

  async getInstance(numberphone: string): Promise<InstanceState | undefined> {
    let instance = this.instances.get(numberphone);

    // Si no está en memoria, intentar recuperarla de DigitalOcean
    if (!instance) {
      const existingDroplet = await getExistingDroplet(numberphone);
      if (existingDroplet) {
        const ipAddress =
          existingDroplet.networks.v4.find(
            (network: { type: string }) => network.type === 'public'
          )?.ip_address || '0.0.0.0';

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
        };

        // Guardar en memoria
        this.instances.set(numberphone, instance);
      }
    }

    return instance;
  }

  updateInstance(numberphone: string, data: Partial<InstanceState>): void {
    const instance = this.instances.get(numberphone);
    if (instance) {
      this.instances.set(numberphone, { ...instance, ...data });
    }
  }

  deleteInstance(numberphone: string): void {
    this.instances.delete(numberphone);
  }
}

export const stateManager = new InstanceStateManager();
