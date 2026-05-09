import { Router } from 'express';
import { PagoController } from './pago.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorizeRoles } from '../../middleware/authorize-roles';

export class PagoRoutes {

  static get routes(): Router {
    const router = Router();
    const controller = new PagoController();

    router.use(authenticate);

    router.get('/metodos', (req, res) => controller.listarMetodosPago(req, res));
    router.post('/', (req, res) => controller.crearPago(req, res));
    router.get('/orden/:id', (req, res) => controller.listarPagosOrden(req, res));
    router.patch('/:id', authorizeRoles('admin', 'gerente'), (req, res) => controller.actualizarEstadoPago(req, res));

    return router;
  }
}