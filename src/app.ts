import express from 'express';
import { createServer } from 'http';
import './config/env';
import { errorHandler } from './middleware/errorHandler';
import adminRoute, { setupAdminWebSocket } from './routes/admin/redis';
import apiRoutes from './routes/api';
import { app } from './server';
import { redisService } from './services/redis/redisService';

const server = createServer(app);

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use(express.json());

// Rutas
app.use('/api', apiRoutes);
app.use('/admin/redis', adminRoute);

// Manejador de errores
app.use(errorHandler);

// Iniciar servidor solo después de conectar a Redis
async function startServer() {
  try {
    await redisService.connect();
    setupAdminWebSocket(server);
    server.listen(process.env.PORT || 3000, () => {
      console.log(`Servidor corriendo en puerto ${process.env.PORT || 3000}`);
    });
  } catch (error: unknown) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();
