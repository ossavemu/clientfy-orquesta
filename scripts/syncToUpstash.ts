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
      // Obtener valor y TTL
      const [value, ttl] = await Promise.all([
        localRedis.get(key),
        localRedis.ttl(key),
      ]);

      if (value) {
        // Sincronizar valor
        await upstashRedis.set(key, value);

        // Sincronizar TTL si existe
        if (ttl > 0) {
          await upstashRedis.expire(key, ttl);
        }

        globalThis.console.log(`✓ Sincronizada clave: ${key}`);
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
