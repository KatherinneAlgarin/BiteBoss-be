import { Router } from 'express';
import { CategoriaController } from './categoria.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorizeRoles } from '../../middleware/authorize-roles';

export class CategoriaRoutes {

  static get routes(): Router {
    const router = Router();
    const controller = new CategoriaController();

    router.use(authenticate);

    router.get('/', (req, res) => controller.listar(req, res));
    router.post('/', authorizeRoles('admin'), (req, res) => controller.crear(req, res));
    router.patch('/:id', authorizeRoles('admin'), (req, res) => controller.actualizar(req, res));
    router.get('/:id/productos-activos', authorizeRoles('admin'), (req, res) => controller.verificarProductosActivos(req, res));
    router.patch('/:id/desactivar', authorizeRoles('admin'), (req, res) => controller.desactivar(req, res));
    router.patch('/:id/activar', authorizeRoles('admin'), (req, res) => controller.activar(req, res));

    return router;
  }
}
