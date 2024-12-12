import { getExistingDroplet } from './droplet/getExistingDroplet.js';

class InstanceStateManager {
  constructor() {
    this.instances = new Map();
  }

  createInstance(numberphone) {
    if (this.instances.has(numberphone)) {
      throw new Error('Ya existe una instancia para este número');
    }

    this.instances.set(numberphone, {
      status: 'creating',
      progress: 0,
      error: null,
      instanceInfo: null,
    });
  }

  async getInstance(numberphone) {
    let instance = this.instances.get(numberphone);

    // Si no está en memoria, intentar recuperarla de DigitalOcean
    if (!instance) {
      const existingDroplet = await getExistingDroplet(numberphone);
      if (existingDroplet) {
        const ipAddress = existingDroplet.networks.v4.find(
          (network) => network.type === 'public'
        )?.ip_address;

        instance = {
          status: 'completed',
          progress: 100,
          error: null,
          instanceInfo: {
            instanceName: `bot-${numberphone}`,
            ip: ipAddress,
            state: existingDroplet.status,
            created: existingDroplet.created_at,
            numberphone,
            dropletId: existingDroplet.id,
          },
        };

        // Guardar en memoria
        this.instances.set(numberphone, instance);
      }
    }

    return instance;
  }

  updateInstance(numberphone, data) {
    const instance = this.instances.get(numberphone);
    if (instance) {
      this.instances.set(numberphone, { ...instance, ...data });
    }
  }

  deleteInstance(numberphone) {
    this.instances.delete(numberphone);
  }
}

export const stateManager = new InstanceStateManager();
