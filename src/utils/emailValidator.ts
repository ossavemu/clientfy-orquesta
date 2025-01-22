// Lista de dominios permitidos
const ALLOWED_DOMAINS = [
  '@gmail.com',
  '@hotmail.com',
  '@outlook.com',
  '@yahoo.com',
  '@live.com',
  '@icloud.com',
  '@siwo-net.com', // Añadimos el nuevo dominio
];

export const validateEmail = async (email: string): Promise<void> => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(email)) {
    throw new Error('Error de validación: Formato de email inválido');
  }

  const isValidDomain = ALLOWED_DOMAINS.some((domain) =>
    email.toLowerCase().endsWith(domain)
  );

  if (!isValidDomain) {
    throw new Error('Error de validación: Dominio de email no permitido');
  }
};
