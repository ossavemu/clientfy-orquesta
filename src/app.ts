import express, { type ErrorRequestHandler } from 'express';
import './config/env';
import { getServerConfig } from './config/server';
import { errorHandler } from './middleware/errorHandler';
import adminRoute, { setupAdminWebSocket } from './routes/admin/redis';
import router from './routes/api';
import dropletRoute from './routes/droplet/create';
import { app, server } from './server';
import { redisService } from './services/redis/redisService';
import { redisSyncService } from './services/sync/redisSyncService';

// Configurar CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, x-api-key'
  );

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use(express.json());

// Rutas
app.use('/api', router);
app.use('/admin/redis', adminRoute);
app.use('/api', dropletRoute);

// Manejador de errores
app.use(errorHandler as ErrorRequestHandler);

// Iniciar servidor solo después de conectar a Redis
async function startServer() {
  try {
    await redisService.connect();

    // Iniciar sincronización Redis
    await redisSyncService.syncExistingData();

    setupAdminWebSocket(server);

    const { port } = await getServerConfig();
    console.log('\n🚀 Iniciando servidor...');
    console.log('📝 Modo:', process.env.NODE_ENV || 'production');
    console.log('🔌 Puerto solicitado:', process.env.PORT || '3000');

    await new Promise<void>((resolve, reject) => {
      server
        .listen(port, () => {
          console.log('✅ Servidor corriendo en:', `http://localhost:${port}`);
          resolve();
        })
        .on('error', (error: Error & { code?: string }) => {
          if (error.code === 'EADDRINUSE') {
            console.error(
              `Puerto ${port} está en uso, buscando otro puerto...`
            );
          }
          reject(error);
        });
    });
  } catch (error: unknown) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();
