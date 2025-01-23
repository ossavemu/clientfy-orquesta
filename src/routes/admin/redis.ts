import type { WebSocketMessage } from '@src/types';
import { type ChildProcess, exec, spawn } from 'child_process';
import { Router } from 'express';
import { createServer } from 'net';

import fs from 'fs';
import { Buffer } from 'node:buffer';
import path from 'path';
import { clearInterval, setInterval } from 'timers';

import type { Server } from 'node:http';
import { type RawData, type WebSocket, WebSocketServer } from 'ws';

const router = Router();

interface ErrnoException extends Error {
  code?: string;
}

// Usar la contraseña desde variables de entorno
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ClientFy0.com';
const REDIS_COMMANDER_PORT = process.env.REDIS_COMMANDER_PORT || 8081;
let redisCommanderProcess: ChildProcess | null = null;

// Ruta para servir la página de admin
router.get('/', (req, res) => {
  try {
    const adminPath = path.join(process.cwd(), 'public', 'admin.html');
    if (!fs.existsSync(adminPath)) {
      res.status(404).send('Archivo admin.html no encontrado');
      return;
    }
    res.sendFile(adminPath);
  } catch (error) {
    console.error('Error al servir admin.html:', error);
    res.status(500).send('Error interno del servidor');
  }
});

// Ruta para obtener la configuración
router.get('/config', (req, res) => {
  res.json({
    redisCommanderPort: REDIS_COMMANDER_PORT,
  });
});

// Función para detener Redis Commander
const stopRedisCommander = () => {
  return new Promise<void>((resolve) => {
    if (redisCommanderProcess) {
      console.log('Deteniendo Redis Commander...');

      const cleanup = () => {
        try {
          if (redisCommanderProcess?.pid) {
            // Verificar si el proceso existe antes de matarlo
            process.kill(redisCommanderProcess.pid, 0);

            if (process.platform !== 'win32') {
              try {
                process.kill(-redisCommanderProcess.pid, 'SIGKILL');
              } catch (error) {
                console.error('Error al matar proceso:', error);
              }
            }
            process.kill(redisCommanderProcess.pid, 'SIGKILL');
          }
        } catch (error: unknown) {
          // Ignorar error ESRCH (No such process)
          if ((error as ErrnoException).code !== 'ESRCH') {
            console.error('Error al matar proceso:', error);
          }
        } finally {
          redisCommanderProcess = null;
          resolve();
        }
      };

      cleanup();
    } else {
      resolve();
    }
  });
};

// Función para verificar si el puerto está en uso
const isPortInUse = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const tester = createServer()
      .once('error', (err: Error & { code?: string }) => {
        if (err.code === 'EADDRINUSE') {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .once('listening', () => {
        tester.once('close', () => resolve(false)).close();
      })
      .listen(port, '0.0.0.0');
  });
};

// Función para matar proceso en puerto específico
const killProcessOnPort = async (port: number): Promise<void> => {
  return new Promise((resolve) => {
    const command =
      process.platform === 'win32'
        ? `netstat -ano | findstr :${port}`
        : `lsof -i :${port} -t`;

    exec(
      command,
      { encoding: 'utf8' },
      (error: Error | null, stdout: string) => {
        if (error || !stdout) {
          console.log(`No se encontró proceso en puerto ${port}`);
          resolve();
          return;
        }

        const pid =
          process.platform === 'win32'
            ? stdout.split('\n')[0].split(/\s+/)[4]
            : stdout.trim();

        if (pid) {
          const killCommand =
            process.platform === 'win32'
              ? `taskkill /F /PID ${pid}`
              : `kill -9 ${pid}`;

          exec(killCommand, { encoding: 'utf8' }, (err: Error | null) => {
            if (err) {
              console.error(`Error al matar proceso en puerto ${port}:`, err);
            } else {
              console.log(`Proceso en puerto ${port} terminado`);
            }
            resolve();
          });
        } else {
          resolve();
        }
      }
    );
  });
};

// Función para iniciar Redis Commander
const startRedisCommander = async () => {
  try {
    // Verificar si el puerto está en uso
    const portInUse = await isPortInUse(Number(REDIS_COMMANDER_PORT));
    if (portInUse) {
      console.log(
        `Puerto ${REDIS_COMMANDER_PORT} en uso, intentando liberar...`
      );
      await killProcessOnPort(Number(REDIS_COMMANDER_PORT));
      // Esperar un momento para asegurar que el puerto se libere
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Asegurarse de que no haya instancias previas
    await stopRedisCommander();

    console.log('Iniciando Redis Commander con configuración:', {
      port: REDIS_COMMANDER_PORT,
      host: process.env.REDIS_HOST || 'localhost',
      redisPort: process.env.REDIS_PORT || '6379',
    });

    return new Promise<void>((resolve, reject) => {
      redisCommanderProcess = spawn(
        'npx',
        [
          'redis-commander',
          '--port',
          REDIS_COMMANDER_PORT.toString(),
          '--address',
          '0.0.0.0',
          '--redis-host',
          process.env.REDIS_HOST || 'localhost',
          '--redis-port',
          process.env.REDIS_PORT || '6379',
          '--redis-password',
          process.env.REDIS_PASSWORD || '',
          '--no-log-data',
          '--noauth',
        ],
        {
          env: process.env,
          detached: true,
          stdio: 'pipe',
          ...(process.platform !== 'win32' && { setpgid: true }),
        }
      );

      let isStarted = false;
      let errorOutput = '';

      if (redisCommanderProcess.stdout) {
        redisCommanderProcess.stdout.on('data', (data) => {
          const output = data.toString();
          console.log(`Redis Commander: ${output}`);
          if (output.includes('listening on')) {
            isStarted = true;
            resolve();
          }
        });
      }

      if (redisCommanderProcess.stderr) {
        redisCommanderProcess.stderr.on('data', (data) => {
          const errorMsg = data.toString();
          errorOutput += errorMsg;
          console.error(`Redis Commander Error: ${errorMsg}`);

          if (errorMsg.includes('EADDRINUSE')) {
            console.log('Detectado error de puerto en uso, reintentando...');
            stopRedisCommander().then(() => {
              setTimeout(() => startRedisCommander(), 1000);
            });
          }
        });
      }

      redisCommanderProcess.on('error', (error) => {
        console.error('Error al iniciar Redis Commander:', error);
        reject(error);
      });

      redisCommanderProcess.on('exit', (code) => {
        if (!isStarted) {
          console.error(`Redis Commander se cerró con código ${code}`);
          console.error('Error acumulado:', errorOutput);
          reject(
            new Error(`Redis Commander falló al iniciar. Código: ${code}`)
          );
        }
      });

      // Timeout de seguridad
      setTimeout(() => {
        if (!isStarted) {
          reject(new Error('Timeout al iniciar Redis Commander'));
        }
      }, 10000);
    });
  } catch (error) {
    console.error('Error al iniciar Redis Commander:', error);
    await stopRedisCommander();
    throw error;
  }
};

// Configurar WebSocket con tipado adecuado
export const setupAdminWebSocket = (server: Server) => {
  const wss = new WebSocketServer({ server, path: '/admin/redis-ws' });
  let activeConnections = 0;

  wss.on('connection', (ws: WebSocket) => {
    console.log('Admin cliente conectado:', new Date().toISOString());
    let heartbeatInterval: ReturnType<typeof setInterval>;
    let missedHeartbeats = 0;
    let redisCommanderWindow: string | null = null;
    let isAuthenticated = false;
    let sessionTimeout: ReturnType<typeof setTimeout>;

    activeConnections++;

    // Función para cerrar la sesión
    const closeSession = () => {
      console.log('Sesión expirada después de 10 minutos');
      ws.send(
        JSON.stringify({
          type: 'session_expired',
          message: 'Sesión expirada por tiempo',
        })
      );
      ws.close();
    };

    // Verificar conexión activa más frecuentemente
    const checkConnection = setInterval(() => {
      if (missedHeartbeats >= 2) {
        console.log('Cliente no responde, cerrando conexión...');
        ws.close();
      } else {
        ws.ping();
        missedHeartbeats++;
      }
    }, 5000);

    ws.on('pong', () => {
      missedHeartbeats = 0;
    });

    ws.on('message', async (data: RawData) => {
      let message: WebSocketMessage;
      try {
        const messageStr = Buffer.isBuffer(data)
          ? data.toString('utf-8')
          : data.toString();
        message = JSON.parse(messageStr);

        if (message.type === 'auth') {
          if (message.password === ADMIN_PASSWORD) {
            isAuthenticated = true;
            console.log('Iniciando nueva sesión de Redis Commander...');
            await startRedisCommander();
            redisCommanderWindow = new Date().toISOString();

            // Iniciar temporizador de 10 minutos
            sessionTimeout = setTimeout(closeSession, 10 * 60 * 1000);

            ws.send(
              JSON.stringify({
                type: 'auth',
                success: true,
                windowId: redisCommanderWindow,
                sessionTimeout: 10 * 60,
              })
            );

            heartbeatInterval = setInterval(() => {
              if (ws.readyState === ws.OPEN) {
                ws.send(
                  JSON.stringify({
                    type: 'heartbeat',
                    windowId: redisCommanderWindow,
                  })
                );
              }
            }, 5000);
          } else {
            ws.send(
              JSON.stringify({
                type: 'auth',
                success: false,
                message: 'Contraseña incorrecta',
              })
            );
          }
        } else if (message.type === 'heartbeat' && isAuthenticated) {
          missedHeartbeats = 0;
        }
      } catch (error) {
        console.error('Error procesando mensaje:', error);
        ws.send(
          JSON.stringify({
            type: 'error',
            message: 'Error procesando mensaje',
          })
        );
      }
    });

    const handleDisconnect = async () => {
      console.log('Cliente desconectado, limpiando recursos...');
      clearInterval(heartbeatInterval);
      clearInterval(checkConnection);
      clearTimeout(sessionTimeout);

      if (isAuthenticated) {
        activeConnections--;
        if (activeConnections === 0) {
          console.log(
            'Último cliente desconectado, deteniendo Redis Commander...'
          );
          await stopRedisCommander();
        }
      }
    };

    ws.on('close', handleDisconnect);
    ws.on('error', handleDisconnect);
  });
};

export default router;
