import { router } from '@src/server';
import calendarCredentialsRoute from './calendar/credentials';
import createRoute from './instance/create';
import deleteRoute from './instance/delete';
import listRoute from './instance/list';
import restartRoute from './instance/restart';
import statusRoute from './instance/status';
import generatePasswordRoute from './password/generate';

router.use('/instance', createRoute);
router.use('/instance', statusRoute);
router.use('/instance', restartRoute);
router.use('/instance', deleteRoute);
router.use('/instance', listRoute);

// Ruta para generación de contraseñas
router.use('/password/generate', generatePasswordRoute);

// Nueva ruta para credenciales del calendario
router.use('/calendar', calendarCredentialsRoute);

export default router;
