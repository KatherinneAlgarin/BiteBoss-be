import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorizeRoles } from '../../middleware/authorize-roles';
import { PedidoProveedorController } from './pedido-proveedor.controller';

export class PedidoProveedorRoutes {

  static get routes(): Router {
    const router = Router();
    const controller = new PedidoProveedorController();

    router.use(authenticate);

    router.get('/', authorizeRoles('admin', 'encargado', 'gerente'), (req, res) => controller.listar(req, res));
    router.get('/:id', authorizeRoles('admin', 'encargado', 'gerente'), (req, res) => controller.obtener(req, res));
    router.post('/', authorizeRoles('admin', 'encargado', 'gerente'), (req, res) => controller.crear(req, res));
    router.patch('/:id', authorizeRoles('admin', 'encargado', 'gerente'), (req, res) => controller.actualizar(req, res));

    return router;
  }
}
