import { Router } from 'express';
import { AuthRoutes } from './auth/auth.routes';
import { UsuarioRoutes } from './usuario/usuario.routes';
import { ProductoRoutes } from './producto/producto.routes';
import { OrdenRoutes } from './orden/orden.routes';
import { PagoRoutes } from './pago/pago.routes';
import { ProveedorRoutes } from './proveedor/proveedor.routes';
import { TipoOrdenRoutes } from './tipo-orden/tipo-orden.routes';
import { TipoPagoRoutes } from './tipo-pago/tipo-pago.routes';
import { SucursalRoutes } from './sucursal/sucursal.routes';
import { ZonaRoutes } from './zona/zona.routes';
import { MesaRoutes } from './mesa/mesa.routes';
import { InventarioRoutes } from './inventario/inventario.routes';

export class AppRoutes {

  static get routes(): Router {
    const router = Router();

    router.use('/api/auth',     AuthRoutes.routes);
    router.use('/api/usuarios', UsuarioRoutes.routes);
    router.use('/api/productos', ProductoRoutes.routes);
    router.use('/api/ordenes', OrdenRoutes.routes);
    router.use('/api/pagos', PagoRoutes.routes);
    router.use('/api/proveedores', ProveedorRoutes.routes);
    router.use('/api/tipos-orden', TipoOrdenRoutes.routes);
    router.use('/api/tipos-pago', TipoPagoRoutes.routes);
    router.use('/api/sucursales', SucursalRoutes.routes);
    router.use('/api/zonas', ZonaRoutes.routes);
    router.use('/api/mesas', MesaRoutes.routes);
    router.use('/api/inventario', InventarioRoutes.routes);


    router.get('/api', (_req, res) => {
      res.json({ mensaje: 'API Restaurante funcionando' });
    });

    return router;
  }
}
