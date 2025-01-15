import dotenv from 'dotenv';

dotenv.config();

export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB || 0,
  // Configuración para persistencia
  saveSettings: {
    // Guardar si al menos 1 cambio en 900 segundos
    save900: { changes: 1, seconds: 900 },
    // Guardar si al menos 10 cambios en 300 segundos
    save300: { changes: 10, seconds: 300 },
    // Guardar si al menos 100 cambios en 60 segundos
    save60: { changes: 100, seconds: 60 },
  },
  // Configuración de memoria
  maxmemory: '256mb',
  maxmemoryPolicy: 'allkeys-lru', // Eliminar las claves menos usadas cuando se llene la memoria
};
