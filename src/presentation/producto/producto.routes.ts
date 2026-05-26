import { Router } from 'express';
import { ProductoController } from './producto.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorizeRoles } from '../../middleware/authorize-roles';

export class ProductoRoutes {

  static get routes(): Router {
    const router = Router();
    const controller = new ProductoController();

    router.use(authenticate);

    router.get('/', (req, res) => controller.listarProductos(req, res));
    router.get('/:id', (req, res) => controller.obtenerProducto(req, res));
    router.get('/:id/sucursales', (req, res) => controller.obtenerSucursalesDeProducto(req, res));
    router.get('/:id/ingredientes', (req, res) => controller.obtenerIngredientesDeProducto(req, res));
    router.get('/:id/componentes-combo', (req, res) => controller.obtenerComponentesCombo(req, res));
    router.get('/:id/dependencias-desactivacion', (req, res) => controller.verificarDependenciasDesactivacion(req, res));
    router.post('/', authorizeRoles('admin', 'gerente'), (req, res) => controller.crearProducto(req, res));
    router.patch('/:id', authorizeRoles('admin', 'gerente'), (req, res) => controller.actualizarProducto(req, res));
    router.delete('/:id', authorizeRoles('admin', 'gerente'), (req, res) => controller.eliminarProducto(req, res));

    return router;
  }
}