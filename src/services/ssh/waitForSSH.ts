import { NodeSSH } from 'node-ssh';

export async function waitForSSH(ip: string, maxAttempts = 60) {
  const ssh = new NodeSSH();
  let attempts = 0;
  const waitTime = 10000;

  while (attempts < maxAttempts) {
    try {
      console.log(
        `Intento de conexión SSH ${
          attempts + 1
        }/${maxAttempts} - Tiempo restante: ${
          (maxAttempts - attempts) * 10
        } segundos`
      );

      await ssh.connect({
        host: ip,
        username: 'root',
        password: process.env.DIGITALOCEAN_SSH_PASSWORD,
        tryKeyboard: true,
        timeout: 30000,
        readyTimeout: 40000,
      });

      const { stdout: systemCheck } = await ssh.execCommand('whoami');
      if (systemCheck.trim() === 'root') {
        console.log('Conexión SSH establecida exitosamente');
        await ssh.dispose();
        return true;
      }

      await ssh.dispose();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      console.log(`Intento fallido (${attempts + 1}): ${errorMessage}`);
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  return false;
}
