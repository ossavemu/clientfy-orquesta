// Lista de dominios permitidos
const ALLOWED_DOMAINS = [
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'live.com',
  'icloud.com',
];

export const validateEmail = (email) => {
  try {
    // Verificar formato básico del email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Formato de email inválido');
    }

    // Verificar longitud del email
    if (email.length > 254) {
      throw new Error('El email es demasiado largo');
    }

    // Separar el dominio del email
    const [localPart, domain] = email.split('@');

    // Verificar longitud de la parte local
    if (localPart.length > 64) {
      throw new Error('La parte local del email es demasiado larga');
    }

    // Verificar caracteres especiales en la parte local
    const localPartRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
    if (!localPartRegex.test(localPart)) {
      throw new Error('El email contiene caracteres no permitidos');
    }

    // Verificar si el dominio está en la lista de permitidos
    if (!ALLOWED_DOMAINS.includes(domain.toLowerCase())) {
      throw new Error('Dominio de email no permitido');
    }

    return true;
  } catch (error) {
    throw new Error(`Error de validación: ${error.message}`);
  }
};
