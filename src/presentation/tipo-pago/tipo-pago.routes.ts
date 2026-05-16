import { Router } from 'express';
import { TipoPagoController } from './tipo-pago.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorizeRoles } from '../../middleware/authorize-roles';

export class TipoPagoRoutes {

  static get routes(): Router {
    const router = Router();
    const controller = new TipoPagoController();

    router.use(authenticate);

    router.get('/', authorizeRoles('admin'), (req, res) => controller.listar(req, res));
    router.get('/:id', authorizeRoles('admin'), (req, res) => controller.obtener(req, res));
    router.post('/', authorizeRoles('admin'), (req, res) => controller.crear(req, res));
    router.patch('/:id', authorizeRoles('admin'), (req, res) => controller.actualizar(req, res));
    router.get('/:id/dependencias-desactivacion', authorizeRoles('admin'), (req, res) => controller.obtenerDependenciasDesactivacion(req, res));
    router.patch('/:id/desactivar', authorizeRoles('admin'), (req, res) => controller.desactivar(req, res));
    router.patch('/:id/activar', authorizeRoles('admin'), (req, res) => controller.activar(req, res));

    return router;
  }
}
