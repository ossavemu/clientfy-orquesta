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
  private localSubRedis: Redis | null = null;  // Solo para suscripciones
  private localRedis: Redis | null = null;     // Para comandos regulares locales
  private upstashRedis: Redis | null = null;   // Para Upstash
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
      const redisOptions = {
        retryStrategy(times: number): number | null {
          if (times > 5) return null;
          return Math.min(times * 1000, 5000);
        },
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
        lazyConnect: true,
      };

      // Conexión dedicada para suscripciones
      this.localSubRedis = new Redis({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
        ...redisOptions,
      });

      // Conexión para comandos regulares locales
      this.localRedis = new Redis({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
        ...redisOptions,
      });
      
      // Conexión para Upstash
      this.upstashRedis = new Redis(process.env.UPSTASH_REDIS_URL || '', {
        tls: { rejectUnauthorized: false },
        ...redisOptions,
      });

      // Conectar explícitamente
      await Promise.all([
        this.localSubRedis.connect(),
        this.localRedis.connect(),
        this.upstashRedis.connect(),
      ]);

      console.log('Conexiones Redis establecidas');
      await this.setupEventListeners();
      this.isInitialized = true;

    } catch (error) {
      console.error('Error inicializando servicio de sincronización:', error);
      throw error;
    }
  }

  private async setupEventListeners() {
    if (!this.localSubRedis || !this.localRedis) return;

    try {
      // Usar this.localRedis en lugar de localRedis
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
    if (!this.upstashRedis || !this.localSubRedis) return;

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
      const value = await this.localRedis.get(key);  // Usar localRedis en lugar de localSubRedis
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
      const hashValue = await this.localRedis.hgetall(key);  // Usar localRedis
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

    const ttl = await this.localRedis.ttl(key);  // Usar localRedis
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
        const keys = await this.localRedis.keys('*');  // Usar localRedis en lugar de localSubRedis

        for (const key of keys) {
            try {
                // Obtener el tipo de la key
                const type = await this.localRedis.type(key);

                switch (type) {
                    case 'string': {
                        const value = await this.localRedis.get(key);
                        if (value) {
                            await this.upstashRedis.set(key, value);
                        }
                        break;
                    }
                    case 'hash': {
                        const hashValue = await this.localRedis.hgetall(key);
                        if (Object.keys(hashValue).length > 0) {
                            await this.upstashRedis.hmset(key, hashValue);
                        }
                        break;
                    }
                    case 'set': {
                        const members = await this.localRedis.smembers(key);
                        if (members.length > 0) {
                            await this.upstashRedis.sadd(key, ...members);
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
                    case 'zset': {
                        const zsetMembers = await this.localRedis.zrange(key, 0, -1, 'WITHSCORES');
                        if (zsetMembers.length > 0) {
                            await this.upstashRedis.zadd(key, ...zsetMembers);
                        }
                        break;
                    }
                    default:
                        console.log(`Tipo no soportado para key ${key}: ${type}`);
                        continue;
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

        console.log('Sincronización inicial completada');
    } catch (error) {
        console.error('Error en sincronización inicial:', error);
        throw error;
    }
  }
}

export const redisSyncService = new RedisSyncService();
