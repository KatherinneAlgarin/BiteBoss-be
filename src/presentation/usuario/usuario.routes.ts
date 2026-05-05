import { Router } from 'express';
import { UsuarioController } from './usuario.controller';
import { authenticate } from '../../middleware/authenticate';

export class UsuarioRoutes {

  static get routes(): Router {
    const router = Router();
    const controller = new UsuarioController();

    // Todas las rutas requieren autenticación (solo admins acceden al módulo de usuarios)
    router.use(authenticate);

    router.get('/',           (req, res) => controller.listarUsuarios(req, res));
    router.get('/roles',      (req, res) => controller.listarRoles(req, res));
    router.get('/sucursales', (req, res) => controller.listarSucursales(req, res));
    router.post('/',          (req, res) => controller.crearUsuario(req, res));

    return router;
  }
}
