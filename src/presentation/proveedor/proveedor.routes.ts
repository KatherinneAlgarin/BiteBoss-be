import { Router } from 'express';
import { ProveedorController } from './proveedor.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorizeRoles } from '../../middleware/authorize-roles';

export class ProveedorRoutes {

  static get routes(): Router {
    const router = Router();
    const controller = new ProveedorController();

    router.use(authenticate);

    router.get('/', (req, res) => controller.listarProveedores(req, res));
    router.get('/:id', (req, res) => controller.obtenerProveedor(req, res));
    router.post('/', authorizeRoles('admin', 'encargado'), (req, res) => controller.crearProveedor(req, res));
    router.patch('/:id', authorizeRoles('admin', 'encargado'), (req, res) => controller.actualizarProveedor(req, res));
    router.delete('/:id', authorizeRoles('admin'), (req, res) => controller.eliminarProveedor(req, res));

    return router;
  }
}
