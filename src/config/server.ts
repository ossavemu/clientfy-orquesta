import { findAvailablePort } from '@src/utils/portUtils';

export const getServerConfig = async () => {
  const defaultPort = process.env.NODE_ENV === 'development' ? 3001 : 3000;
  const envPort = process.env.PORT ? parseInt(process.env.PORT) : defaultPort;

  try {
    const port = await findAvailablePort(envPort);
    return { port };
  } catch {
    console.error(`No se pudo encontrar un puerto disponible desde ${envPort}`);
    process.exit(1);
  }
};
