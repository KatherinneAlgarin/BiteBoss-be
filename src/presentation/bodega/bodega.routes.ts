import { Router } from 'express';
import { BodegaController } from './bodega.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorizeRoles } from '../../middleware/authorize-roles';

export class BodegaRoutes {

  static get routes(): Router {
    const router = Router();
    const controller = new BodegaController();

    router.use(authenticate);
    router.use(authorizeRoles('admin', 'encargado', 'gerente'));

    router.get('/', (req, res) => controller.listar(req, res));
    router.get('/:id', (req, res) => controller.obtener(req, res));
    router.get('/:id/tiene-stock', (req, res) => controller.verificarStock(req, res));
    router.post('/', (req, res) => controller.crear(req, res));
    router.patch('/:id', (req, res) => controller.actualizar(req, res));
    router.patch('/:id/activar', (req, res) => controller.activar(req, res));
    router.patch('/:id/desactivar', (req, res) => controller.desactivar(req, res));

    return router;
  }
}
