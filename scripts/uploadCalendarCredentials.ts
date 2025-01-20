import Redis from 'ioredis';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de Redis desde variables de entorno
const redis = new Redis({
  host: globalThis.process.env.REDIS_HOST || 'localhost',
  port: Number(globalThis.process.env.REDIS_PORT) || 6379,
  password: globalThis.process.env.REDIS_PASSWORD || '',
});

async function uploadCredentials() {
  try {
    // Leer el archivo JSON
    const credentialsPath = path.join(
      path.dirname(__dirname), // Usamos __dirname en lugar de process.cwd()
      'CREDENTIALS.json'
    );
    const credentials = fs.readFileSync(credentialsPath, 'utf8');

    // Guardar en Redis
    await redis.set('CALENDAR_CREDENTIALS', credentials);
    globalThis.console.log('Credenciales subidas exitosamente a Redis');

    // Cerrar la conexión
    await redis.quit();
  } catch (error) {
    globalThis.console.error('Error al subir credenciales:', error);
    globalThis.process.exit(1);
  }
}

uploadCredentials();
