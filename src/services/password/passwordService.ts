import { sendPasswordEmail } from '@src/services/email/emailService';
import { redisService } from '@src/services/redis/redisService';
import { validateEmail } from '@src/utils/emailValidator';
import { formatTimestamp } from '@src/utils/time';

import KSUID from 'ksuid';

export const generateAndSendPassword = async (email: string) => {
  try {
    // Validar email
    await validateEmail(email);

    // Generar KSUID como contraseña
    const ksuid = await KSUID.random();
    const password = ksuid.string.substring(0, 10);

    // La clave será simplemente: password:{email}
    const redisKey = `password:${email}`;

    // Verificar si ya existe una contraseña para este email
    const existingPassword = await redisService.get(redisKey);

    // Crear objeto con la información de la contraseña
    const passwordInfo = {
      password,
      email,
      timestamp: formatTimestamp(),
      created_at: existingPassword
        ? existingPassword.created_at
        : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Guardar en Redis
    await redisService.set(redisKey, passwordInfo);

    // Enviar email
    await sendPasswordEmail(email, password);

    return {
      success: true,
      message: existingPassword
        ? 'Contraseña actualizada exitosamente'
        : 'Contraseña generada exitosamente',
      email: email,
      timestamp: passwordInfo.timestamp,
      created_at: passwordInfo.created_at,
      updated_at: passwordInfo.updated_at,
    };
  } catch (error) {
    console.error('Error en generateAndSendPassword:', error);
    throw error;
  }
};

// Función para obtener la contraseña de un email
export const getPassword = async (email: string) => {
  try {
    await validateEmail(email);

    const redisKey = `password:${email}`;
    const passwordInfo = await redisService.get(redisKey);

    if (!passwordInfo) {
      throw new Error('No se encontró contraseña para este email');
    }

    return {
      success: true,
      email,
      timestamp: passwordInfo.timestamp,
      created_at: passwordInfo.created_at,
      updated_at: passwordInfo.updated_at,
    };
  } catch (error) {
    console.error('Error obteniendo contraseña:', error);
    throw error;
  }
};

export const generateSecurePassword = (): string => {
  const length = 12;
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
  let password = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }

  return password;
};

export const validateCredentials = async (email: string, password: string) => {
  try {
    // Validar email
    await validateEmail(email);

    const redisKey = `password:${email}`;
    const passwordInfo = await redisService.get(redisKey);

    if (!passwordInfo) {
      throw new Error('No se encontró registro para este email');
    }

    const isValid = passwordInfo.password === password;

    return {
      success: true,
      email,
      isValid,
      message: isValid
        ? 'Las credenciales son válidas'
        : 'La contraseña es incorrecta',
      lastUpdate: passwordInfo.updated_at,
    };
  } catch (error) {
    console.error('Error validando credenciales:', error);
    throw error;
  }
};
