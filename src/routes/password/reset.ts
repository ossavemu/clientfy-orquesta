import { authMiddleware } from '@src/middleware/authMiddleware';
import { sendPasswordResetEmail } from '@src/services/email/emailService';
import { redisService } from '@src/services/redis/redisService';
import type { ResetPasswordRequestBody, ResetTokenInfo } from '@src/types';
import type { Request, Response } from 'express';
import { Router } from 'express';

const router = Router();

router.post(
  '/',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, servicePassword }: ResetPasswordRequestBody = req.body;

      if (!email || !servicePassword) {
        res.status(400).json({
          success: false,
          message: 'Email y contraseña de servicio son requeridos',
        });
        return;
      }

      // Verificar si existe la contraseña en Redis con el prefijo correcto
      const passwordInfo = await redisService.get(`password:${email}`);

      if (!passwordInfo || passwordInfo.password !== servicePassword) {
        res.status(401).json({
          success: false,
          message: 'Credenciales inválidas',
        });
        return;
      }

      // Generar token único usando el generador nativo de Bun
      const resetToken = Bun.randomUUIDv7();

      // Guardar token en Redis con expiración de 24 horas
      await redisService.set<ResetTokenInfo>(
        `reset:${resetToken}`,
        {
          email,
        },
        24 * 60 * 60 // 24 horas en segundos
      );

      // Enviar email con el token
      await sendPasswordResetEmail(email, resetToken);

      res.json({
        success: true,
        message: 'Se ha enviado un enlace de restablecimiento a tu correo',
      });
    } catch (error) {
      console.error('Error en reset password:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud de restablecimiento',
      });
    }
  }
);

export default router;
