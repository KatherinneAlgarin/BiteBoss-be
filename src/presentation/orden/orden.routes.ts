import { Router } from 'express';
import { OrdenController } from './orden.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorizeRoles } from '../../middleware/authorize-roles';

export class OrdenRoutes {

  static get routes(): Router {
    const router = Router();
    const controller = new OrdenController();

    router.use(authenticate);

    router.get('/', (req, res) => controller.listarOrdenes(req, res));
    router.get('/:id', (req, res) => controller.obtenerOrden(req, res));
    router.post('/', (req, res) => {
      res.status(410).json({
        mensaje: 'Creación de órdenes no disponible en esta versión. Este endpoint ha sido removido permanentemente.',
      });
    });
    router.patch('/:id', (req, res) => controller.actualizarOrden(req, res));
    router.delete('/:id', authorizeRoles('admin', 'gerente'), (req, res) => controller.cancelarOrden(req, res));

    // Detalles
    router.post('/:id/detalles', (req, res) => controller.agregarDetalle(req, res));
    router.patch('/:id/detalles/:detalleId', (req, res) => controller.actualizarDetalle(req, res));
    router.delete('/:id/detalles/:detalleId', (req, res) => controller.removerDetalle(req, res));

    return router;
  }
}