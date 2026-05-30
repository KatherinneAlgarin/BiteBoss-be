import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorizeRoles } from '../../middleware/authorize-roles';
import { CajaCierreController } from './caja-cierre.controller';

export class CajaCierreRoutes {
  static get routes(): Router {
    const router = Router();
    const controller = new CajaCierreController();

    router.use(authenticate);

    router.get('/sesion-activa', authorizeRoles('admin', 'cajero'), (req, res) => controller.obtenerSesionActiva(req, res));
    router.get('/cajeros-activos', authorizeRoles('admin', 'gerente', 'mesero'), (req, res) => controller.listarCajerosActivos(req, res));
    router.post('/iniciar', authorizeRoles('admin', 'cajero'), (req, res) => controller.iniciarSesion(req, res));

    router.get('/actual', authorizeRoles('admin', 'cajero'), (req, res) => controller.obtenerResumenActual(req, res));
    router.post('/solicitar', authorizeRoles('admin', 'cajero'), (req, res) => controller.solicitarCierre(req, res));

    router.get('/', authorizeRoles('admin', 'gerente'), (req, res) => controller.listarCierres(req, res));
    router.patch('/:id/autorizar', authorizeRoles('admin', 'gerente'), (req, res) => controller.autorizarCierre(req, res));
    router.patch('/:id/rechazar', authorizeRoles('admin', 'gerente'), (req, res) => controller.rechazarCierre(req, res));
    router.patch('/:id/reautorizar', authorizeRoles('admin', 'gerente'), (req, res) => controller.reautorizarCierre(req, res));

    return router;
  }
}
