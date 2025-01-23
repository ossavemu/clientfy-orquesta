import { findAvailablePort } from '@src/utils/port';

export const getServerConfig = async () => {
  const envPort = Number(process.env.PORT ?? 3000);
  try {
    const port = await findAvailablePort(envPort);
    return { port };
  } catch {
    console.error(`No se pudo encontrar un puerto disponible desde ${envPort}`);
    process.exit(1);
  }
};
