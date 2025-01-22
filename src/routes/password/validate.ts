import { validateCredentials } from '@src/services/password/passwordService';
import type { ApiResponse } from '@src/types';
import { Router, type RequestHandler } from 'express';

const router = Router();

const validatePassword: RequestHandler<
  {},
  ApiResponse<{ email: string; isValid: boolean }>,
  { email: string; password: string }
> = async (req, res, next): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'El email y la contraseña son requeridos',
      });
      return;
    }

    const result = await validateCredentials(email, password);
    res.json(result);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('Error de validación')) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
      if (error.message.includes('No se encontró')) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }
    next(error);
  }
};

router.post('/', validatePassword);

export default router; 