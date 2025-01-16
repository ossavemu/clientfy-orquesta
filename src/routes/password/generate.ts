import { router } from '@src/server';
import {
  generateAndSendPassword,
  getPassword,
} from '@src/services/password/passwordService';

import type { ApiResponse } from '@src/types';
import type { RequestHandler } from 'express';

// Generar nueva contraseña
// Generar nueva contraseña
const generatePassword: RequestHandler<
  {},
  ApiResponse<{ email: string }>,
  { email: string }
> = async (req, res, next): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'El email es requerido',
      });
      return;
    }

    const result = await generateAndSendPassword(email);
    res.json(result);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes('Error de validación')
    ) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }
    next(error);
  }
};

router.post('/', generatePassword);

// Obtener información de la contraseña
const getPasswordInfo: RequestHandler<
  { email: string },
  ApiResponse<{ email: string }>,
  {}
> = async (req, res, next): Promise<void> => {
  try {
    const { email } = req.params;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'El email es requerido',
      });
      return;
    }

    const result = await getPassword(email);
    res.json(result);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('No se encontró contraseña')) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }
      if (error.message.includes('Error de validación')) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }
    next(error);
  }
};

router.get('/:email', getPasswordInfo);

export default router;
