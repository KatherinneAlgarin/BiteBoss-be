import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorizeRoles } from '../../middleware/authorize-roles';
import { InventarioController } from './inventario.controller';

export class InventarioRoutes {

  static get routes(): Router {
    const router = Router();
    const controller = new InventarioController();

    router.use(authenticate);

    router.get('/stock-actual', authorizeRoles('admin', 'encargado', 'gerente'), (req, res) => controller.listarStockActual(req, res));
    router.get('/stock-ingredientes', authorizeRoles('admin', 'encargado', 'gerente'), (req, res) => controller.listarStockIngredientes(req, res));
    router.get('/movimientos', authorizeRoles('admin', 'encargado', 'gerente'), (req, res) => controller.listarMovimientos(req, res));
    router.post('/stock-ingrediente', authorizeRoles('admin', 'encargado', 'gerente'), (req, res) => controller.registrarStockIngrediente(req, res));
    router.patch('/:id/ajuste', authorizeRoles('admin', 'encargado'), (req, res) => controller.ajustarStock(req, res));
    router.patch('/:id/limites', authorizeRoles('admin', 'encargado', 'gerente'), (req, res) => controller.actualizarLimites(req, res));
    router.post('/:id/transferir', authorizeRoles('admin', 'encargado', 'gerente'), (req, res) => controller.transferirStock(req, res));

    return router;
  }
}
