import express from 'express';
import { createServer } from 'http';
import './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import adminRoute, { setupAdminWebSocket } from './routes/admin/redis.js';
import apiRoutes from './routes/api.js';
import { redisService } from './services/redis/redisService.js';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use(express.json());

// Rutas
app.use('/api', apiRoutes);
app.use('/admin/redis', adminRoute);

// Configurar WebSocket para admin
setupAdminWebSocket(server);

// Manejador de errores
app.use(errorHandler);

// Iniciar servidor solo después de conectar a Redis
async function startServer() {
  try {
    await redisService.connect();
    server.listen(PORT, () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

startServer();
