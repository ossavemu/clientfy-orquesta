import axios from 'axios';

const API_URL = 'http://localhost:3000/api';
const NUMBERPHONE = '573053483248';

interface InstanceStatus {
  status: string;
  progress: number;
  error?: string;
  instanceInfo?: {
    ip: string | null;
    instanceName: string;
    state: string;
  };
}

/**
 * Monitorea el estado de la instancia hasta que esté completada o falle
 * @returns La información de la instancia si fue exitosa, null si falló
 */
async function monitorInstanceStatus(): Promise<InstanceStatus | null> {
  console.log('\n📡 Monitoreando estado de la instancia...');

  let lastStatus = '';
  let lastProgress = 0;
  let startTime = Date.now();

  while (true) {
    try {
      const response = await axios.get<{
        success: boolean;
        error?: string;
        data: InstanceStatus;
      }>(`${API_URL}/instance/status/${NUMBERPHONE}`, {
        headers: {
          'x-api-key': process.env.SECRET_KEY,
        },
      });

      if (!response.data.success) {
        console.error('\n❌ Error:', response.data.error);
        return null;
      }

      const instanceData = response.data.data;
      const { status, progress } = instanceData;

      // Solo mostrar cambios de estado o progreso
      if (status !== lastStatus || progress !== lastProgress) {
        const timeElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n⏱️  ${timeElapsed}s - Estado: ${status} (${progress}%)`);

        if (instanceData.instanceInfo?.ip) {
          console.log(`🌐 IP: ${instanceData.instanceInfo.ip}`);
        }

        lastStatus = status;
        lastProgress = progress;
      }

      // Estados finales
      if (status === 'completed') {
        console.log('\n✅ ¡Instancia creada exitosamente!');
        return instanceData;
      } else if (status === 'failed') {
        console.error('\n❌ Error en la creación:', instanceData.error);
        return null;
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.error('\n❌ La instancia no fue encontrada');
        return null;
      }
      console.error('\n❌ Error al verificar estado:', error);
      return null;
    }
  }
}

/**
 * Crea una instancia de prueba y monitorea su progreso
 * Este script sirve como ejemplo de cómo usar la API para crear instancias
 */
async function createTestInstance() {
  try {
    console.log('🚀 Iniciando creación de instancia de prueba');
    console.log('📱 Número de teléfono:', NUMBERPHONE);
    console.log('⚙️  Configuración:', {
      enableAppointments: true,
      enableAutoInvite: true,
    });

    // 1. Crear la instancia
    const response = await axios.post(
      `${API_URL}/instance/create`,
      {
        numberphone: NUMBERPHONE,
        enableAppointments: true,
        enableAutoInvite: true,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.SECRET_KEY,
        },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error);
    }

    // 2. Monitorear el progreso
    const instanceData = await monitorInstanceStatus();

    if (instanceData?.instanceInfo?.ip) {
      const qrUrl = `http://${instanceData.instanceInfo.ip}:3008`;
      console.log('\n🔍 Información final:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📱 Número:', NUMBERPHONE);
      console.log('🌐 IP:', instanceData.instanceInfo.ip);
      console.log('🤖 Nombre:', instanceData.instanceInfo.instanceName);
      console.log('🔵 Estado:', instanceData.instanceInfo.state);
      console.log('🔗 URL del QR:', qrUrl);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n📝 Para escanear el QR:');
      console.log(`1. Abre ${qrUrl} en tu navegador`);
      console.log('2. Escanea el código QR con WhatsApp');
      console.log('3. Sigue las instrucciones en WhatsApp');
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        '\n❌ Error:',
        error.response?.data?.error || error.message
      );
    } else {
      console.error('\n❌ Error desconocido:', error);
    }
    process.exit(1);
  }
}

// Ejecutar el script
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🤖 Script de Creación de Instancia ClientFy');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
createTestInstance();
