const token = process.env.DIGITALOCEAN_TOKEN?.trim();
console.log(
  'Token actual:',
  token ? 'Configurado (longitud: ' + token.length + ')' : 'No configurado'
);

if (!token) {
  console.warn('DIGITALOCEAN_TOKEN no está configurado');
  throw new Error('DIGITALOCEAN_TOKEN es requerido');
}

export const DO_API_URL = 'https://api.digitalocean.com/v2';

export const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

console.log('Headers configurados:', {
  ...headers,
  Authorization: headers.Authorization
    ? 'Bearer [TOKEN]'
    : headers.Authorization,
});
