export const formatTimestamp = () => {
  return new Date().toLocaleString('es-ES', {
    dateStyle: 'full',
    timeStyle: 'long',
    timeZone: 'America/Cancun',
  });
};
