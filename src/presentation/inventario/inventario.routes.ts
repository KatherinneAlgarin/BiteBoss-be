import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorizeRoles } from '../../middleware/authorize-roles';
import { InventarioController } from './inventario.controller';

export class InventarioRoutes {

  static get routes(): Router {
    const router = Router();
    const controller = new InventarioController();

    router.use(authenticate);

    router.get(
      '/stock-actual',
      authorizeRoles('admin', 'encargado', 'gerente'),
      (req, res) => controller.listarStockActual(req, res)
    );

    return router;
  }
}
