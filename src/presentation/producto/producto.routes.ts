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
    router.post('/', authorizeRoles('admin', 'gerente'), (req, res) => controller.crearProducto(req, res));
    router.patch('/:id', authorizeRoles('admin', 'gerente'), (req, res) => controller.actualizarProducto(req, res));
    router.delete('/:id', authorizeRoles('admin', 'gerente'), (req, res) => controller.eliminarProducto(req, res));

    router.get('/categorias/listar', (req, res) => controller.listarCategorias(req, res));
    router.post('/categorias', authorizeRoles('admin', 'gerente'), (req, res) => controller.crearCategoria(req, res));

    return router;
  }
}