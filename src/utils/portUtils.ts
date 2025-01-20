import net from 'net';

export const findAvailablePort = async (
  startPort: number,
  maxPort: number = startPort + 100
): Promise<number> => {
  for (let port = startPort; port <= maxPort; port++) {
    try {
      await new Promise((resolve, reject) => {
        const server = net
          .createServer()
          .listen(port)
          .once('error', reject)
          .once('listening', () => {
            server.close();
            resolve(port);
          });
      });
      return port;
    } catch {
      continue;
    }
  }
  throw new Error(
    `No se encontró ningún puerto disponible entre ${startPort} y ${maxPort}`
  );
};

export const getPort = () => {
  return process.env.PORT || 3001;
};
