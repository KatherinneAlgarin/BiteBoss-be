import { Router } from 'express';
import { AuthRoutes } from './auth/auth.routes';

export class AppRoutes {

  static get routes(): Router {
    const router = Router();

    router.use('/api/auth', AuthRoutes.routes);

    // Ruta de salud
    router.get('/api', (_req, res) => {
      res.json({ mensaje: 'API Restaurante funcionando' });
    });

    return router;
  }
}
