import { Router } from 'express';
import { KpiController } from './kpi.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorizeRoles } from '../../middleware/authorize-roles';

export class KpiRoutes {
  static get routes(): Router {
    const router = Router();
    const controller = new KpiController();

    router.use(authenticate);

    router.get('/ventas',
      authorizeRoles('admin', 'gerente'),
      (req, res) => controller.ventas(req, res),
    );

    router.get('/comparativa',
      authorizeRoles('admin'),
      (req, res) => controller.comparativa(req, res),
    );

    return router;
  }
}
