import { redisConfig } from '@src/config/redis';
import type { PasswordInfo } from '@src/types';

import Redis from 'ioredis';

class RedisService {
  client: Redis | null;
  isConnected: boolean;

  constructor() {
    this.client = null;
    this.isConnected = false;
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
        retryStrategy(times: number): number {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      });

      // Configurar eventos
      this.client.on('connect', () => {
        console.log('Conectado a Redis exitosamente');
        this.isConnected = true;
      });

      this.client.on('error', (error: Error) => {
        console.error('Error en la conexión Redis:', error);
        this.isConnected = false;
      });

      // Configurar persistencia
      await this.configureRedis();

      return this.client;
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error inicializando Redis:', error.message);
      } else {
        console.error('Error inicializando Redis:', error);
      }
      throw error;
    }
  }

  private async configureRedis(): Promise<void> {
    try {
      if (this.client) {
        // Configurar políticas de guardado
        await this.client.config('SET', 'save', '900 1 300 10 60 100');

        // Configurar memoria máxima
        await this.client.config('SET', 'maxmemory', redisConfig.maxmemory);
        await this.client.config(
          'SET',
          'maxmemory-policy',
          redisConfig.maxmemoryPolicy
        );

        // Habilitar AOF para persistencia
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

  async set(
    key: string,
    value: PasswordInfo,
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
export const redisService = new RedisService();

let redisClient: Redis | null = null;

export const getRedisClient = async () => {
  if (!redisClient) {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
    });
  }
  return redisClient;
};
