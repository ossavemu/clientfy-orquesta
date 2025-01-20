import { config } from 'dotenv';

config();

export const requiredEnvVars = [
  'REDIS_HOST',
  'REDIS_PORT',
  'REDIS_PASSWORD',
  'UPSTASH_REDIS_URL',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Variable de entorno requerida no encontrada: ${envVar}`);
  }
}

// Bun carga automáticamente el .env
console.log('Variables de entorno cargadas:', {
  token: process.env.DIGITALOCEAN_TOKEN ? 'Configurado' : 'No configurado',
  password: process.env.DIGITALOCEAN_SSH_PASSWORD
    ? 'Configurado'
    : 'No configurado',
  port: process.env.PORT || '3000',
});
