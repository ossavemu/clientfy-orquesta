import type { GeneratePasswordBody } from '@src/types';
import axios from 'axios';
import type { Request, Response } from 'express';
import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// Ruta para servir la página de generación de contraseñas
router.get('/', (req: Request, res: Response) => {
  try {
    const adminPath = path.join(process.cwd(), 'public', 'admin-password.html');
    if (!fs.existsSync(adminPath)) {
      res.status(404).send('Archivo admin-password.html no encontrado');
      return;
    }
    res.sendFile(adminPath);
  } catch (error) {
    console.error('Error al servir admin-password.html:', error);
    res.status(500).send('Error interno del servidor');
  }
});

// Ruta para generar contraseña (requiere autenticación admin)
router.post(
  '/generate',
  async (req: Request<{}, {}, GeneratePasswordBody>, res: Response) => {
    const { adminPassword, email } = req.body;

    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      res.status(401).json({
        success: false,
        message: 'Contraseña de administrador incorrecta',
      });
      return;
    }

    try {
      const result = await axios.post(
        `${req.protocol}://${req.get('host')}/api/password/generate`,
        { email },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.SECRET_KEY as string,
          },
        }
      );

      const data = result.data;
      res.json(data);
    } catch (error) {
      console.error('Error generando contraseña:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar contraseña',
      });
    }
  }
);

export default router;
