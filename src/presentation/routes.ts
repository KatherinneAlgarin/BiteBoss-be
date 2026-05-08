import { Router } from 'express';
import { AuthRoutes } from './auth/auth.routes';
import { UsuarioRoutes } from './usuario/usuario.routes';
import { ProductoRoutes } from './producto/producto.routes';
import { OrdenRoutes } from './orden/orden.routes';
import { PagoRoutes } from './pago/pago.routes';

export class AppRoutes {

  static get routes(): Router {
    const router = Router();

    router.use('/api/auth',     AuthRoutes.routes);
    router.use('/api/usuarios', UsuarioRoutes.routes);
    router.use('/api/productos', ProductoRoutes.routes);
    router.use('/api/ordenes', OrdenRoutes.routes);
    router.use('/api/pagos', PagoRoutes.routes);

    
    router.get('/api', (_req, res) => {
      res.json({ mensaje: 'API Restaurante funcionando' });
    });

    return router;
  }
}
