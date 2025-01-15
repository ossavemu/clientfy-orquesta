import express from 'express';
import {
  generateAndSendPassword,
  getPassword,
} from '../../services/password/passwordService.js';

const router = express.Router();

// Generar nueva contraseña
router.post('/', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'El email es requerido',
      });
    }

    const result = await generateAndSendPassword(email);
    res.json(result);
  } catch (error) {
    if (error.message.includes('Error de validación')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
});

// Obtener información de la contraseña
router.get('/:email', async (req, res, next) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'El email es requerido',
      });
    }

    const result = await getPassword(email);
    res.json(result);
  } catch (error) {
    if (error.message.includes('No se encontró contraseña')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message.includes('Error de validación')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
});

export default router;
