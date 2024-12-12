import axios from 'axios';
import express from 'express';
import { NodeSSH } from 'node-ssh';
import { DO_API_URL, headers } from '../config/digitalocean.js';
import {
  createDroplet,
  waitForDropletActive,
} from '../services/droplet/createDroplet.js';
import { getExistingDroplet } from '../services/droplet/getExistingDroplet.js';
import { stateManager } from '../services/instanceStateManager.js';
import { initializeInstance } from '../services/ssh/initializeInstance.js';
import { waitForSSH } from '../services/ssh/waitForSSH.js';

const router = express.Router();

// Endpoint para iniciar el proceso
router.post('/instance/create', async (req, res) => {
  const { numberphone, provider = 'baileys' } = req.body;

  if (!numberphone) {
    return res.status(400).json({ error: 'numberphone es requerido' });
  }

  try {
    stateManager.createInstance(numberphone);

    // Iniciar el proceso en background
    processInstance(numberphone, provider).catch((error) => {
      console.error('Error en el proceso:', error);
      stateManager.updateInstance(numberphone, {
        status: 'error',
        error: error.message,
      });
    });

    // Responder inmediatamente
    return res.json({
      success: true,
      numberphone,
      status: 'creating',
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// Endpoint para verificar el estado
router.get('/instance/status/:numberphone', async (req, res) => {
  const { numberphone } = req.params;

  try {
    const instance = await stateManager.getInstance(numberphone);

    if (!instance) {
      return res.status(404).json({ error: 'Instancia no encontrada' });
    }

    return res.json(instance);
  } catch (error) {
    console.error('Error al obtener estado:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Endpoint para reiniciar una instancia
router.post('/instance/restart/:numberphone', async (req, res) => {
  const { numberphone } = req.params;

  try {
    const instance = await stateManager.getInstance(numberphone);

    if (!instance) {
      return res.status(404).json({ error: 'Instancia no encontrada' });
    }

    const dropletId = instance.instanceInfo?.dropletId;
    if (!dropletId) {
      throw new Error('No se encontró el ID del droplet');
    }

    await axios.post(
      `${DO_API_URL}/droplets/${dropletId}/actions`,
      { type: 'reboot' },
      { headers }
    );

    stateManager.updateInstance(numberphone, {
      status: 'restarting',
      progress: 0,
    });

    // Iniciar proceso de reinicio en background
    restartInstance(numberphone, dropletId).catch((error) => {
      console.error('Error en el reinicio:', error);
      stateManager.updateInstance(numberphone, {
        status: 'error',
        error: error.message,
      });
    });

    return res.json({
      success: true,
      message: 'Reinicio iniciado',
    });
  } catch (error) {
    console.error('Error al reiniciar:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Endpoint para eliminar una instancia
router.delete('/instance/:numberphone', async (req, res) => {
  const { numberphone } = req.params;

  try {
    const instance = await stateManager.getInstance(numberphone);

    if (!instance) {
      return res.status(404).json({ error: 'Instancia no encontrada' });
    }

    const dropletId = instance.instanceInfo?.dropletId;
    if (!dropletId) {
      throw new Error('No se encontró el ID del droplet');
    }

    await axios.delete(`${DO_API_URL}/droplets/${dropletId}`, { headers });
    stateManager.deleteInstance(numberphone);

    return res.json({
      success: true,
      message: 'Instancia eliminada correctamente',
    });
  } catch (error) {
    console.error('Error al eliminar:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Función para actualizar el archivo .env en la instancia
async function updateInstanceEnv(ssh, provider, numberphone) {
  const providerLower = provider.toLowerCase();
  const { stdout: currentEnv } = await ssh.execCommand(
    'cat /root/ClientFyAdmin/.env'
  );
  const envLines = currentEnv.split('\n');

  const updateEnvVar = (name, value) => {
    const index = envLines.findIndex((line) => line.startsWith(`${name}=`));
    if (index !== -1) {
      envLines[index] = `${name}=${value}`;
    } else {
      envLines.push(`${name}=${value}`);
    }
  };

  updateEnvVar('PROVIDER', providerLower);

  if (providerLower === 'baileys') {
    updateEnvVar('P_NUMBER', numberphone);
  } else if (providerLower === 'meta') {
    updateEnvVar('numberId', numberphone);
  }

  const newEnv = envLines.join('\n');
  await ssh.execCommand(`echo '${newEnv}' > /root/ClientFyAdmin/.env`);
}

// Función que maneja todo el proceso en background
async function processInstance(numberphone, provider) {
  try {
    const instanceName = `bot-${numberphone}`;
    stateManager.updateInstance(numberphone, {
      progress: 10,
      status: 'checking_existing',
    });

    const existingDroplet = await getExistingDroplet(numberphone);
    let droplet;
    let ipAddress;

    if (existingDroplet) {
      stateManager.updateInstance(numberphone, {
        progress: 30,
        status: 'found_existing',
      });
      droplet = existingDroplet;
      ipAddress = existingDroplet.networks.v4.find(
        (network) => network.type === 'public'
      )?.ip_address;

      if (!ipAddress) {
        throw new Error('No se pudo obtener la IP del droplet existente');
      }
    } else {
      stateManager.updateInstance(numberphone, {
        progress: 20,
        status: 'creating_droplet',
      });

      const userData = [
        '#!/bin/bash',
        '# Configurar contraseña root',
        `echo "root:${process.env.DIGITALOCEAN_SSH_PASSWORD}" | chpasswd`,
        "sed -i 's/PermitRootLogin no/PermitRootLogin yes/' /etc/ssh/sshd_config",
        "sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config",
        'systemctl restart sshd',
        '',
        '# Instalar screen',
        'apt-get update',
        'apt-get install -y screen',
      ].join('\n');

      droplet = await createDroplet(
        instanceName,
        numberphone,
        provider,
        userData
      );
      stateManager.updateInstance(numberphone, {
        progress: 40,
        status: 'waiting_activation',
      });

      droplet = await waitForDropletActive(droplet.id);
      stateManager.updateInstance(numberphone, {
        progress: 60,
        status: 'configuring',
      });

      ipAddress = droplet.networks.v4.find(
        (network) => network.type === 'public'
      )?.ip_address;

      if (!ipAddress) {
        throw new Error('No se pudo obtener la IP del droplet');
      }

      const ssh = new NodeSSH();
      try {
        await ssh.connect({
          host: ipAddress,
          username: 'root',
          password: process.env.DIGITALOCEAN_SSH_PASSWORD,
          tryKeyboard: true,
          timeout: 30000,
        });

        await updateInstanceEnv(ssh, provider, numberphone);
      } finally {
        await ssh.dispose();
      }
    }

    console.log('Verificando conexión SSH...');
    const sshReady = await waitForSSH(ipAddress);

    if (!sshReady) {
      throw new Error(
        'No se pudo establecer conexión SSH después de varios intentos'
      );
    }

    console.log('Inicializando instancia...');
    await initializeInstance(ipAddress);

    const instanceInfo = {
      instanceName,
      ip: ipAddress,
      state: droplet.status,
      created: existingDroplet
        ? existingDroplet.created_at
        : new Date().toISOString(),
      provider,
      numberphone,
      dropletId: droplet.id,
    };

    stateManager.updateInstance(numberphone, {
      status: 'completed',
      progress: 100,
      instanceInfo,
    });
  } catch (error) {
    stateManager.updateInstance(numberphone, {
      status: 'error',
      error: error.message,
    });
    throw error;
  }
}

// Función para manejar el reinicio en background
async function restartInstance(numberphone, dropletId) {
  try {
    stateManager.updateInstance(numberphone, {
      status: 'waiting_restart',
      progress: 30,
    });

    // Esperar a que el droplet esté activo después del reinicio
    await waitForDropletActive(dropletId);

    stateManager.updateInstance(numberphone, {
      status: 'restarted',
      progress: 100,
    });
  } catch (error) {
    stateManager.updateInstance(numberphone, {
      status: 'error',
      error: error.message,
    });
    throw error;
  }
}

export default router;
