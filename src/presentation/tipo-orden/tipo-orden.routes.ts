import { Router } from 'express';
import { TipoOrdenController } from './tipo-orden.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorizeRoles } from '../../middleware/authorize-roles';

export class TipoOrdenRoutes {

  static get routes(): Router {
    const router = Router();
    const controller = new TipoOrdenController();

    router.use(authenticate);

    router.get('/', (req, res) => controller.listar(req, res));
    router.get('/:id', (req, res) => controller.obtener(req, res));
    router.post('/', authorizeRoles('admin'), (req, res) => controller.crear(req, res));
    router.patch('/:id', authorizeRoles('admin'), (req, res) => controller.actualizar(req, res));
    router.patch('/:id/activar', authorizeRoles('admin'), (req, res) => controller.activar(req, res));
    router.patch('/:id/desactivar', authorizeRoles('admin'), (req, res) => controller.desactivar(req, res));

    return router;
  }
}
