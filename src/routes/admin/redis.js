import { spawn } from 'child_process';
import express from 'express';
import path from 'path';
import { clearInterval, setInterval } from 'timers';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Usar la contraseña desde variables de entorno
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ClientFy0.com';
const REDIS_COMMANDER_PORT = process.env.REDIS_COMMANDER_PORT || 8081;
let redisCommanderProcess = null;

// Ruta para servir la página de admin
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../../public/admin.html'));
});

// Ruta para obtener la configuración
router.get('/config', (req, res) => {
  res.json({
    redisCommanderPort: process.env.REDIS_COMMANDER_PORT || 8081,
  });
});

// Función para iniciar Redis Commander
const startRedisCommander = () => {
  if (redisCommanderProcess) return;

  redisCommanderProcess = spawn(
    'npx',
    [
      'redis-commander',
      '--port',
      REDIS_COMMANDER_PORT,
      '--address',
      '0.0.0.0',
      '--redis-host',
      process.env.REDIS_HOST,
      '--redis-port',
      process.env.REDIS_PORT,
      '--redis-password',
      process.env.REDIS_PASSWORD,
      '--no-log-data',
      '--noauth',
    ],
    {
      env: process.env,
    }
  );

  redisCommanderProcess.stdout.on('data', (data) => {
    console.log(`Redis Commander: ${data}`);
  });

  redisCommanderProcess.stderr.on('data', (data) => {
    console.error(`Redis Commander Error: ${data}`);
  });

  return new Promise((resolve) => {
    setTimeout(() => resolve(), 2000);
  });
};

// Función para detener Redis Commander
const stopRedisCommander = () => {
  if (redisCommanderProcess) {
    console.log('Deteniendo Redis Commander...');

    // Enviar SIGTERM primero
    redisCommanderProcess.kill('SIGTERM');

    // Dar un tiempo para que se cierre gracefully
    setTimeout(() => {
      // Si aún está corriendo, forzar el cierre
      if (redisCommanderProcess) {
        console.log('Forzando cierre de Redis Commander...');
        redisCommanderProcess.kill('SIGKILL');
      }
    }, 5000);

    // Manejar el evento de cierre
    redisCommanderProcess.on('exit', (code, signal) => {
      console.log(
        `Redis Commander cerrado con código ${code} y señal ${signal}`
      );
      redisCommanderProcess = null;
    });

    // Manejar errores
    redisCommanderProcess.on('error', (err) => {
      console.error('Error al cerrar Redis Commander:', err);
      redisCommanderProcess = null;
    });
  }
};

// Configurar WebSocket
export const setupAdminWebSocket = (server) => {
  const wss = new WebSocketServer({ server, path: '/admin/redis-ws' });

  wss.on('connection', (ws) => {
    console.log('Admin cliente conectado:', new Date().toISOString());
    let heartbeatInterval;

    ws.on('message', async (data) => {
      const message = JSON.parse(data);

      if (message.type === 'auth') {
        if (message.password === ADMIN_PASSWORD) {
          console.log('Iniciando nueva sesión de Redis Commander...');
          await startRedisCommander();
          ws.send(JSON.stringify({ type: 'auth', success: true }));

          // Iniciar heartbeat
          heartbeatInterval = setInterval(() => {
            ws.send(JSON.stringify({ type: 'heartbeat' }));
          }, 30000);
        } else {
          console.log('Intento fallido de autenticación');
          ws.send(
            JSON.stringify({
              type: 'auth',
              success: false,
              message: 'Contraseña incorrecta',
            })
          );
        }
      }
    });

    ws.on('close', () => {
      console.log('Admin cliente desconectado:', new Date().toISOString());
      clearInterval(heartbeatInterval);
      stopRedisCommander();
    });

    // Manejar errores de WebSocket
    ws.on('error', (error) => {
      console.error('Error en WebSocket:', error);
      clearInterval(heartbeatInterval);
      stopRedisCommander();
    });
  });
};

export default router;
