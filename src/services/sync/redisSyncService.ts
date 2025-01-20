import { Redis } from 'ioredis';

const RedisEvent = {
  SET: 'set',
  HSET: 'hset',
  DEL: 'del',
  EXPIRE: 'expire',
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
    [RedisEvent.HSET]: this.handleSetEvent.bind(this),
    [RedisEvent.DEL]: this.handleDeleteEvent.bind(this),
    [RedisEvent.EXPIRE]: this.handleExpireEvent.bind(this),
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
      });

      console.log('Conexión principal Redis establecida');

      // Conexión separada solo para suscripciones
      this.localSubRedis = new Redis({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
      });

      console.log('Conexión de suscripción Redis establecida');

      // Conexión a Upstash
      this.upstashRedis = new Redis(process.env.UPSTASH_REDIS_URL || '', {
        tls: { rejectUnauthorized: false },
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
      // Extraer la key completa después de "__keyspace@0__:"
      const key = channel.replace('__keyspace@0__:', '');
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

  async syncExistingData() {
    if (!this.localRedis || !this.upstashRedis) return;

    try {
      console.log('Iniciando sincronización inicial de datos...');

      // Usar la conexión principal para obtener las keys
      const keys = await this.localRedis.keys('*');

      for (const key of keys) {
        const value = await this.localRedis.get(key);
        if (value) {
          await this.upstashRedis.set(key, value);

          // Sincronizar TTL si existe
          const ttl = await this.localRedis.ttl(key);
          if (ttl > 0) {
            await this.upstashRedis.expire(key, ttl);
          }
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
