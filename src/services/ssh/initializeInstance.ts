import axios from 'axios';
import { NodeSSH } from 'node-ssh';

async function waitForQRCode(ip: string, maxAttempts = 12): Promise<boolean> {
  console.log('Esperando generación del código QR...');
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(`http://${ip}:3008`, {
        responseType: 'arraybuffer',
        timeout: 5000,
      });

      if (
        response.status === 200 &&
        response.headers['content-type']?.includes('image')
      ) {
        console.log('Código QR generado exitosamente');
        return true;
      }
    } catch (error) {
      console.log(
        `Esperando QR... (${attempts + 1}/${maxAttempts}); error: ${error}`
      );
    }

    attempts++;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  return false;
}

export async function initializeInstance(
  ip: string,
  numberphone: string,
  companyName: string,
  address: string,
  features: {
    virtualAppointments: boolean;
    inPersonAppointments: boolean;
    autoInvite: boolean;
  }
) {
  const ssh = new NodeSSH();

  try {
    console.log('Conectando a la instancia por SSH...');
    await ssh.connect({
      host: ip,
      username: 'root',
      password: process.env.DIGITALOCEAN_SSH_PASSWORD,
      tryKeyboard: true,
    });

    // Verificar que node está instalado y su versión
    console.log('Verificando Node.js...');
    const nodeCheck = await ssh.execCommand(
      'export PATH="$HOME/.local/share/fnm/node-versions/v22.13.1/installation/bin:$PATH" && node --version'
    );
    console.log('Información de Node:', nodeCheck.stdout);
    if (nodeCheck.stderr) {
      console.error('Error al verificar Node:', nodeCheck.stderr);
      throw new Error('No se pudo encontrar Node.js en el sistema');
    }

    // Actualizar variables de entorno
    const envCommands = [
      `sed -i 's/^P_NUMBER=.*/P_NUMBER=${numberphone}/' /root/ClientFyAdmin/.env`,
      `sed -i 's/^ENABLE_AUTO_INVITE=.*/ENABLE_AUTO_INVITE=${features.autoInvite}/' /root/ClientFyAdmin/.env`,
      `sed -i 's/^ENABLE_VIRTUAL_APPOINTMENTS=.*/ENABLE_VIRTUAL_APPOINTMENTS=${features.virtualAppointments}/' /root/ClientFyAdmin/.env`,
      `sed -i 's/^ENABLE_IN_PERSON_APPOINTMENTS=.*/ENABLE_IN_PERSON_APPOINTMENTS=${features.inPersonAppointments}/' /root/ClientFyAdmin/.env`,
      `sed -i 's/^COMPANY_NAME=.*/COMPANY_NAME="${companyName}"/' /root/ClientFyAdmin/.env`,
      `sed -i 's/^COMPANY_ADDRESS=.*/COMPANY_ADDRESS="${address}"/' /root/ClientFyAdmin/.env`,
    ];

    for (const cmd of envCommands) {
      console.log('Ejecutando:', cmd);
      const result = await ssh.execCommand(cmd);
      if (result.stderr) {
        console.error('Error al ejecutar comando:', result.stderr);
      }
    }

    // Verificar que el puerto 3008 no está en uso
    console.log('Verificando puerto 3008...');
    const portCheck = await ssh.execCommand('lsof -i :3008');
    if (portCheck.stdout) {
      console.log('Limpiando puerto 3008...');
      await ssh.execCommand('kill $(lsof -t -i:3008)');
    }

    // Dar permisos de ejecución a los scripts
    console.log('Configurando permisos de scripts...');
    await ssh.execCommand('cd /root/ClientFyAdmin && chmod +x start.sh');

    // Iniciar la aplicación usando start.sh
    console.log('Iniciando aplicación con start.sh...');
    const startResult = await ssh.execCommand(
      'cd /root/ClientFyAdmin && ./start.sh'
    );

    if (startResult.stderr) {
      console.error('Error al iniciar aplicación:', startResult.stderr);
      throw new Error('Error al iniciar la aplicación');
    }

    console.log('Esperando 20 segundos para inicialización...');
    await new Promise((resolve) => setTimeout(resolve, 20000));

    // Verificar logs
    console.log('Verificando logs...');
    const logs = await ssh.execCommand('cat /root/ClientFyAdmin/app.log');
    console.log(
      'Logs de la aplicación:',
      logs.stdout || 'Sin logs disponibles'
    );
    if (logs.stderr) {
      console.error('Error al leer logs:', logs.stderr);
    }

    // Verificar que el proceso está corriendo
    const processCheck = await ssh.execCommand(
      'screen -ls | grep clientfy-bot'
    );
    if (!processCheck.stdout) {
      throw new Error('La aplicación no está corriendo');
    }

    // Esperar a que el QR esté disponible
    const qrReady = await waitForQRCode(ip);
    if (!qrReady) {
      throw new Error('Timeout esperando la generación del código QR');
    }

    console.log('Inicialización completada exitosamente');
  } catch (error) {
    console.error('Error en la inicialización:', error);
    throw error;
  } finally {
    ssh.dispose();
  }
}
