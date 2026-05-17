import { Router } from 'express';
import { ReservacionController } from './reservacion.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorizeRoles } from '../../middleware/authorize-roles';

export class ReservacionRoutes {

  static get routes(): Router {
    const router = Router();
    const controller = new ReservacionController();

    router.use(authenticate);
    router.use(authorizeRoles('gerente', 'mesero'));

    router.get('/',                        (req, res) => controller.listar(req, res));
    router.post('/',                       (req, res) => controller.crear(req, res));
    router.patch('/:id',                   (req, res) => controller.actualizar(req, res));
    router.patch('/:id/cancelar',          (req, res) => controller.cancelar(req, res));
    router.patch('/:id/reactivar',         (req, res) => controller.reactivar(req, res));
    router.patch('/:id/completar',         (req, res) => controller.completar(req, res));

    return router;
  }
}
