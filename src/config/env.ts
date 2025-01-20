// Bun carga automáticamente el .env
console.log('Variables de entorno cargadas:', {
  token: process.env.DIGITALOCEAN_TOKEN ? 'Configurado' : 'No configurado',
  password: process.env.DIGITALOCEAN_SSH_PASSWORD
    ? 'Configurado'
    : 'No configurado',
  port: process.env.PORT || '3000',
});
