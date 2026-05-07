import { Router } from 'express';
import { AuthController } from './auth.controller';

export class AuthRoutes {

  static get routes(): Router {
    const router = Router();
    const controller = new AuthController();

    router.post('/login',              (req, res) => controller.login(req, res));
    router.post('/olvidar-contrasena', (req, res) => controller.olvidarContrasena(req, res));

    return router;
  }
}
