import { Redis } from 'ioredis';

const RedisEvent = {
  SET: 'set',
  HSET: 'hset',
  DEL: 'del',
  EXPIRE: 'expire',
  SADD: 'sadd',
} as const;

type EventHandler = (_key: string) => Promise<void>;

class RedisSyncService {
  private localRedis: Redis | null = null;
  private localSubRedis: Redis | null = null;
  private upstashRedis: Redis | null = null;
  private isInitialized = false;

  private eventHandlers: Record<
    (typeof RedisEvent)[keyof typeof RedisEvent],
    EventHandler
  > = {
    [RedisEvent.SET]: this.handleSetEvent.bind(this),
    [RedisEvent.HSET]: this.handleHashSetEvent.bind(this),
    [RedisEvent.DEL]: this.handleDeleteEvent.bind(this),
    [RedisEvent.EXPIRE]: this.handleExpireEvent.bind(this),
    [RedisEvent.SADD]: this.handleSetAddEvent.bind(this),
  };

  constructor() {
    this.setupRedisConnections();
  }

  private async setupRedisConnections() {
    try {
      // Conexión principal para operaciones
      this.localRedis = new Redis({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
        retryStrategy(times: number): number | null {
          const maxRetryTime = 30000;
          const delay = Math.min(times * 50, maxRetryTime);
          return delay;
        },
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
      });

      // Mejorar manejo de eventos
      this.localRedis.on('error', (error: Error) => {
        if (!error.message.includes('connect ECONNREFUSED')) {
          console.error('Error en conexión Redis local:', error);
        }
      });

      console.log('Conexión principal Redis establecida');

      // Conexión separada solo para suscripciones
      this.localSubRedis = new Redis({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
        retryStrategy(times: number): number | null {
          const maxRetryTime = 30000;
          const delay = Math.min(times * 50, maxRetryTime);
          return delay;
        },
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
      });

      console.log('Conexión de suscripción Redis establecida');

      // Conexión a Upstash
      this.upstashRedis = new Redis(process.env.UPSTASH_REDIS_URL || '', {
        tls: { rejectUnauthorized: false },
        retryStrategy(times: number): number | null {
          const maxRetryTime = 30000;
          const delay = Math.min(times * 50, maxRetryTime);
          return delay;
        },
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
      });

      console.log('Conexión Upstash establecida');

      // Verificar conexiones
      await Promise.all([
        this.localRedis.ping(),
        this.localSubRedis.ping(),
        this.upstashRedis.ping(),
      ]);

      console.log('Todas las conexiones verificadas con PING');

      // Configurar monitores de eventos
      await this.setupEventListeners();

      this.isInitialized = true;
      console.log(
        'Servicio de sincronización Redis inicializado correctamente'
      );
    } catch (error) {
      console.error('Error inicializando servicio de sincronización:', error);
      throw error;
    }
  }

  private async setupEventListeners() {
    if (!this.localRedis || !this.localSubRedis) return;

    try {
      // Configurar notificaciones de keyspace en la conexión principal
      await this.localRedis.config('SET', 'notify-keyspace-events', 'KEA');
      console.log('Notificaciones keyspace configuradas');

      // Monitor para cambios usando la conexión de suscripción
      this.localSubRedis.on('pmessage', async (_pattern, channel, message) => {
        console.log('Evento pmessage recibido:', {
          _pattern,
          channel,
          message,
        });
        try {
          await this.handleRedisEvent(channel, message);
        } catch (error) {
          console.error('Error procesando evento Redis:', error);
        }
      });

      // Suscribirse usando la conexión dedicada para suscripciones
      await this.localSubRedis.psubscribe('__keyspace@*__:*');
      console.log('Suscripción a eventos keyspace completada');
    } catch (error) {
      console.error('Error en setupEventListeners:', error);
      throw error;
    }
  }

  private async handleRedisEvent(channel: string, message: string) {
    if (!this.upstashRedis || !this.localRedis) return;

    try {
      // Extraer la key completa después del primer "__keyspace@0__:"
      const keyStartIndex = channel.indexOf('__:') + 3;
      const key = channel.substring(keyStartIndex);

      console.log(
        `Evento recibido - Canal: ${channel}, Mensaje: ${message}, Key: ${key}`
      );

      const event = message as (typeof RedisEvent)[keyof typeof RedisEvent];
      const handler = this.eventHandlers[event];

      if (handler) {
        console.log(`Ejecutando handler para evento: ${event}`);
        await handler(key);
      } else {
        console.log(`No hay handler para el evento: ${event}`);
      }
    } catch (error) {
      console.error('Error sincronizando evento:', error);
    }
  }

  private async handleSetEvent(key: string): Promise<void> {
    if (!this.localRedis || !this.upstashRedis) return;

    try {
      const value = await this.localRedis.get(key);
      console.log(`Sincronizando SET - Key: ${key}, Valor:`, value);

      if (value) {
        await this.upstashRedis.set(key, value);
        console.log(`✓ Valor sincronizado en Upstash - Key: ${key}`);
      }
    } catch (error) {
      console.error(`Error en handleSetEvent para key ${key}:`, error);
    }
  }

  private async handleHashSetEvent(key: string): Promise<void> {
    if (!this.localRedis || !this.upstashRedis) return;

    try {
      const hashValue = await this.localRedis.hgetall(key);
      console.log(`Sincronizando HSET - Key: ${key}, Valor:`, hashValue);

      if (Object.keys(hashValue).length > 0) {
        await this.upstashRedis.hmset(key, hashValue);
        console.log(`✓ Hash sincronizado en Upstash - Key: ${key}`);
      }
    } catch (error) {
      console.error(`Error en handleHashSetEvent para key ${key}:`, error);
    }
  }

  private async handleDeleteEvent(key: string): Promise<void> {
    if (!this.upstashRedis) return;
    await this.upstashRedis.del(key);
  }

  private async handleExpireEvent(key: string): Promise<void> {
    if (!this.localRedis || !this.upstashRedis) return;

    const ttl = await this.localRedis.ttl(key);
    if (ttl && ttl > 0) {
      await this.upstashRedis.expire(key, ttl);
    }
  }

  private async handleSetAddEvent(key: string): Promise<void> {
    if (!this.localRedis || !this.upstashRedis) return;

    try {
      const members = await this.localRedis.smembers(key);
      console.log(`Sincronizando SADD - Key: ${key}, Miembros:`, members);

      if (members.length > 0) {
        await this.upstashRedis.sadd(key, ...members);
        console.log(`✓ Set sincronizado en Upstash - Key: ${key}`);
      }
    } catch (error) {
      console.error(`Error en handleSetAddEvent para key ${key}:`, error);
    }
  }

  async syncExistingData() {
    if (!this.localRedis || !this.upstashRedis) return;

    try {
      console.log('Iniciando sincronización inicial de datos...');
      const keys = await this.localRedis.keys('*');

      for (const key of keys) {
        // Primero obtener el tipo de la key
        const type = await this.localRedis.type(key);

        try {
          switch (type) {
            case 'string': {
              const strValue = await this.localRedis.get(key);
              if (strValue) await this.upstashRedis.set(key, strValue);
              break;
            }

            case 'hash': {
              const hashValue = await this.localRedis.hgetall(key);
              if (Object.keys(hashValue).length > 0) {
                await this.upstashRedis.hmset(key, hashValue);
              }
              break;
            }

            case 'list': {
              const listValue = await this.localRedis.lrange(key, 0, -1);
              if (listValue.length > 0) {
                await this.upstashRedis.rpush(key, ...listValue);
              }
              break;
            }

            case 'set': {
              const setValue = await this.localRedis.smembers(key);
              if (setValue.length > 0) {
                await this.upstashRedis.sadd(key, ...setValue);
              }
              break;
            }

            default:
              console.log(`Tipo no manejado para key ${key}: ${type}`);
          }

          // Sincronizar TTL si existe
          const ttl = await this.localRedis.ttl(key);
          if (ttl > 0) {
            await this.upstashRedis.expire(key, ttl);
          }

          console.log(`✓ Sincronizada key: ${key} (${type})`);
        } catch (error) {
          console.error(`Error sincronizando key ${key}:`, error);
        }
      }

      console.log(
        `Sincronización completada: ${keys.length} claves sincronizadas`
      );
    } catch (error) {
      console.error('Error en sincronización inicial:', error);
      throw error;
    }
  }
}

export const redisSyncService = new RedisSyncService();
