import { NodeSSH } from 'node-ssh';

export async function initializeInstance(ip) {
  const ssh = new NodeSSH();

  try {
    await ssh.connect({
      host: ip,
      username: 'root',
      password: process.env.DIGITALOCEAN_SSH_PASSWORD,
      tryKeyboard: true,
    });

    const commands = [
      'if ! swapon -s | grep -q /swapfile; then sudo swapon /swapfile || true; fi',
      'if [ ! -d "/root/ClientFyAdmin" ]; then git clone https://github.com/ossavemu/ClientFyAdmin.git /root/ClientFyAdmin; fi',
      'cd /root/ClientFyAdmin',
      'git init || true',
      'git config --global --add safe.directory /root/ClientFyAdmin || true',
      // ... resto de los comandos
    ];

    for (const cmd of commands) {
      console.log(`Ejecutando: ${cmd}`);
      const result = await ssh.execCommand(cmd);
      if (result.stderr && !cmd.includes('|| true')) {
        throw new Error(`Error ejecutando comando ${cmd}: ${result.stderr}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log('Inicialización completada exitosamente');
  } catch (error) {
    console.error('Error en la inicialización:', error);
    throw error;
  } finally {
    ssh.dispose();
  }
}
