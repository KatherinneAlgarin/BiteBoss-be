import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/authenticate';

export class AuthRoutes {
  static get routes(): Router {
    const router = Router();
    const controller = new AuthController();

    router.post('/olvidar-contrasena', (req, res) => controller.olvidarContrasena(req, res));
    router.get( '/me', authenticate,    (req, res) => controller.me(req, res));

    return router;
  }
}
