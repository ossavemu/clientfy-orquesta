import { Router } from 'express';
import calendarCredentialsRoute from './calendar/credentials';
import createRoute from './instance/create';
import deleteInstanceRoute from './instance/delete';
import listRoute from './instance/list';
import restartRoute from './instance/restart';
import statusRoute from './instance/status';
import generatePasswordRoute from './password/generate';

const router = Router();

// Middleware para evitar acceso directo a /api
router.get('/', (req, res) => {
  res.status(403).json({
    error: 'Acceso denegado',
    message: 'No se permite el acceso directo a esta ruta',
  });
});

// Rutas de instancias
router.use('/instance', createRoute);
router.use('/instance', statusRoute);
router.use('/instance', restartRoute);
router.use('/instance', deleteInstanceRoute);
router.use('/instance', listRoute);

// Ruta para generación de contraseñas
router.use('/password/generate', generatePasswordRoute);

// Nueva ruta para credenciales del calendario
router.use('/calendar', calendarCredentialsRoute);

export default router;
