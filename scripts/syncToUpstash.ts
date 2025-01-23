import Redis from 'ioredis';

const localRedis = new Redis({
  host: globalThis.process.env.REDIS_HOST || 'localhost',
  port: Number(globalThis.process.env.REDIS_PORT) || 6379,
  password: globalThis.process.env.REDIS_PASSWORD,
});

const upstashRedis = new Redis(globalThis.process.env.UPSTASH_REDIS_URL || '', {
  tls: { rejectUnauthorized: false },
});

async function syncToUpstash() {
  try {
    globalThis.console.log('Iniciando sincronización con Upstash...');

    // Obtener todas las keys de Redis local
    const keys = await localRedis.keys('*');
    globalThis.console.log(
      `Encontradas ${keys.length} claves para sincronizar`
    );

    for (const key of keys) {
      try {
        // Obtener el tipo de la key
        const type = await localRedis.type(key);
        const ttl = await localRedis.ttl(key);

        switch (type) {
          case 'string': {
            const value = await localRedis.get(key);
            if (value) {
              await upstashRedis.set(key, value);
            }
            break;
          }
          case 'hash': {
            const hashValue = await localRedis.hgetall(key);
            if (Object.keys(hashValue).length > 0) {
              await upstashRedis.hmset(key, hashValue);
            }
            break;
          }
          case 'set': {
            const members = await localRedis.smembers(key);
            if (members.length > 0) {
              await upstashRedis.sadd(key, ...members);
            }
            break;
          }
          case 'list': {
            const listValue = await localRedis.lrange(key, 0, -1);
            if (listValue.length > 0) {
              await upstashRedis.rpush(key, ...listValue);
            }
            break;
          }
          case 'zset': {
            const zsetMembers = await localRedis.zrange(key, 0, -1, 'WITHSCORES');
            if (zsetMembers.length > 0) {
              await upstashRedis.zadd(key, ...zsetMembers);
            }
            break;
          }
          default:
            globalThis.console.log(`Tipo no soportado para key ${key}: ${type}`);
            continue;
        }

        // Sincronizar TTL si existe
        if (ttl > 0) {
          await upstashRedis.expire(key, ttl);
        }

        globalThis.console.log(`✓ Sincronizada clave: ${key} (${type})`);
      } catch (error) {
        globalThis.console.error(`Error sincronizando key ${key}:`, error);
      }
    }

    globalThis.console.log('¡Sincronización completada!');
  } catch (error) {
    globalThis.console.error('Error durante la sincronización:', error);
  } finally {
    // Cerrar conexiones
    await localRedis.quit();
    await upstashRedis.quit();
  }
}

syncToUpstash();
