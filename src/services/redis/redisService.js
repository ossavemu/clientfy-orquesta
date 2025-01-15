import Redis from 'ioredis';
import { redisConfig } from '../../config/redis.js';

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      if (this.isConnected) {
        return this.client;
      }

      this.client = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db,
        retryStrategy(times) {
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

      this.client.on('error', (error) => {
        console.error('Error en la conexión Redis:', error);
        this.isConnected = false;
      });

      // Configurar persistencia
      await this.configureRedis();

      return this.client;
    } catch (error) {
      console.error('Error inicializando Redis:', error);
      throw error;
    }
  }

  async configureRedis() {
    try {
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
    } catch (error) {
      console.error('Error configurando Redis:', error);
      throw error;
    }
  }

  async set(key, value, expirationSeconds = null) {
    try {
      if (expirationSeconds) {
        await this.client.setex(key, expirationSeconds, JSON.stringify(value));
      } else {
        await this.client.set(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error('Error guardando en Redis:', error);
      throw error;
    }
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error obteniendo de Redis:', error);
      throw error;
    }
  }

  async delete(key) {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Error eliminando de Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      console.log('Desconectado de Redis');
    }
  }
}

// Exportar una única instancia
export const redisService = new RedisService();
