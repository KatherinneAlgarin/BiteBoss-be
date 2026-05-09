import { Router } from 'express';
import { UsuarioController } from './usuario.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorizeRoles } from '../../middleware/authorize-roles';

export class UsuarioRoutes {

  static get routes(): Router {
    const router = Router();
    const controller = new UsuarioController();

    router.use(authenticate);

    router.get('/perfil',  (req, res) => controller.obtenerPerfil(req, res));
    router.patch('/perfil', (req, res) => controller.actualizarPerfil(req, res));

    router.get('/', (req, res) => controller.listarUsuarios(req, res));
    router.get('/roles', authorizeRoles('admin'), (req, res) => controller.listarRoles(req, res));
    router.get('/sucursales', authorizeRoles('admin'), (req, res) => controller.listarSucursales(req, res));
    router.post('/', authorizeRoles('admin'), (req, res) => controller.crearUsuario(req, res));

    return router;
  }
}
