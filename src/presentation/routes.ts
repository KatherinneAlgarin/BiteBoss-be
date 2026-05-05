import { Router } from 'express';
import { AuthRoutes } from './auth/auth.routes';
import { UsuarioRoutes } from './usuario/usuario.routes';

export class AppRoutes {

  static get routes(): Router {
    const router = Router();

    router.use('/api/auth',     AuthRoutes.routes);
    router.use('/api/usuarios', UsuarioRoutes.routes);

    
    router.get('/api', (_req, res) => {
      res.json({ mensaje: 'API Restaurante funcionando' });
    });

    return router;
  }
}
