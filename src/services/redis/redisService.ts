import { redisConfig } from '@src/config/redis';
import type { PasswordInfo } from '@src/types';

import Redis from 'ioredis';

export class RedisService {
  private static instance: RedisService;
  client: Redis | null;
  isConnected: boolean;

  private constructor() {
    this.client = null;
    this.isConnected = false;
  }

  static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  async connect(): Promise<Redis> {
    try {
      if (this.isConnected && this.client) {
        return this.client;
      }

      this.client = new Redis({
        host: redisConfig.host,
        port: Number(redisConfig.port),
        password: redisConfig.password,
        db: Number(redisConfig.db),
        retryStrategy(times: number): number | null {
          if (times > 5) {
            console.log('Máximo número de reintentos alcanzado');
            return null; // detener reintentos después de 5 intentos
          }
          const delay = Math.min(times * 1000, 5000);
          return delay;
        },
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
        lazyConnect: true, // No conectar automáticamente
      });

      // Manejar eventos una sola vez
      this.client.once('connect', () => {
        console.log('Conectado a Redis exitosamente');
        this.isConnected = true;
      });

      this.client.on('error', (error: Error) => {
        // Solo logear el primer error de conexión
        if (!this.isConnected && !error.message.includes('ECONNREFUSED')) {
          console.error('Error en la conexión Redis:', error);
        }
      });

      // Intentar conectar explícitamente
      await this.client.connect();
      
      if (this.isConnected) {
        await this.configureRedis();
      }

      return this.client;
    } catch (error) {
      console.error('Error fatal inicializando Redis:', error);
      throw error;
    }
  }

  private async configureRedis(): Promise<void> {
    try {
      if (this.client) {
        await this.client.config('SET', 'save', '900 1 300 10 60 100');

        await this.client.config('SET', 'maxmemory', redisConfig.maxmemory);
        await this.client.config(
          'SET',
          'maxmemory-policy',
          redisConfig.maxmemoryPolicy
        );

        await this.client.config('SET', 'appendonly', 'yes');
        await this.client.config('SET', 'appendfsync', 'everysec');

        console.log('Configuración de Redis aplicada exitosamente');
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error configurando Redis:', error.message);
      } else {
        console.error('Error configurando Redis:', error);
      }
      throw error;
    }
  }

  async set<T>(
    key: string,
    value: T,
    expirationSeconds: number | null = null
  ): Promise<void> {
    try {
      if (this.client) {
        if (expirationSeconds) {
          await this.client.setex(
            key,
            expirationSeconds,
            JSON.stringify(value)
          );
        } else {
          await this.client.set(key, JSON.stringify(value));
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error guardando en Redis:', error.message);
      } else {
        console.error('Error guardando en Redis: Error desconocido');
      }
      throw error;
    }
  }

  async get(key: string): Promise<PasswordInfo | null> {
    try {
      if (this.client) {
        const value = await this.client.get(key);
        return value ? (JSON.parse(value) as PasswordInfo) : null;
      }
      return null;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error obteniendo de Redis:', error.message);
      } else {
        console.error('Error obteniendo de Redis: Error desconocido');
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      if (this.client) {
        await this.client.del(key);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error eliminando de Redis:', error.message);
      } else {
        console.error('Error eliminando de Redis: Error desconocido');
      }
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      console.log('Desconectado de Redis');
    }
  }
}

// Exportar una única instancia
export const redisService = RedisService.getInstance();

// Eliminar getRedisClient ya que usaremos la instancia única
export const getRedisClient = async () => {
  await redisService.connect();
  return redisService.client;
};
