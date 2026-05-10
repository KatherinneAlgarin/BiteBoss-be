import { Router } from 'express';
import { TipoPagoController } from './tipo-pago.controller';
import { authenticate } from '../../middleware/authenticate';

export class TipoPagoRoutes {

  static get routes(): Router {
    const router = Router();
    const controller = new TipoPagoController();

    router.use(authenticate);

    router.get('/', (req, res) => controller.listar(req, res));

    return router;
  }
}
