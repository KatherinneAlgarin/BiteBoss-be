import { Request, Response } from 'express';
import { AppError } from '../../helpers/app-error';
import { CajaCierreService } from '../../services/caja-cierre.service';

export class CajaCierreController {
  constructor(private readonly cajaCierreService = new CajaCierreService()) {}

  async listarCajerosActivos(req: Request, res: Response): Promise<void> {
    try {
      const id_sucursal = req.usuario?.id_sucursal;

      if (!id_sucursal) {
        res.status(401).json({ mensaje: 'Usuario sin contexto de sucursal' });
        return;
      }

      const cajeros = await this.cajaCierreService.listarCajerosConSesionActiva(id_sucursal);
      res.json(cajeros);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async obtenerSesionActiva(req: Request, res: Response): Promise<void> {
    try {
      const id_usuario = req.usuario?.id_usuario;
      const id_sucursal = req.usuario?.id_sucursal;

      if (!id_usuario || !id_sucursal) {
        res.status(401).json({ mensaje: 'Usuario sin contexto de sucursal' });
        return;
      }

      const sesion = await this.cajaCierreService.obtenerSesionActiva(id_usuario, id_sucursal);
      res.json({ activa: !!sesion, sesion });
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async iniciarSesion(req: Request, res: Response): Promise<void> {
    try {
      const id_usuario = req.usuario?.id_usuario;
      const id_sucursal = req.usuario?.id_sucursal;
      const codigo_empleado = typeof req.body?.codigo_empleado === 'string' ? req.body.codigo_empleado.trim() : '';

      if (!id_usuario || !id_sucursal) {
        res.status(401).json({ mensaje: 'Usuario sin contexto de sucursal' });
        return;
      }

      if (!codigo_empleado) {
        res.status(400).json({ mensaje: 'El código de empleado es requerido' });
        return;
      }

      const resumen = await this.cajaCierreService.iniciarSesion(id_usuario, id_sucursal, codigo_empleado);
      res.status(201).json(resumen);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async obtenerResumenActual(req: Request, res: Response): Promise<void> {
    try {
      const id_usuario = req.usuario?.id_usuario;
      const id_sucursal = req.usuario?.id_sucursal;

      if (!id_usuario || !id_sucursal) {
        res.status(401).json({ mensaje: 'Usuario sin contexto de sucursal' });
        return;
      }

      const resumen = await this.cajaCierreService.obtenerResumenActual(id_usuario, id_sucursal);
      res.json(resumen);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async solicitarCierre(req: Request, res: Response): Promise<void> {
    try {
      const id_usuario = req.usuario?.id_usuario;
      const id_sucursal = req.usuario?.id_sucursal;

      if (!id_usuario || !id_sucursal) {
        res.status(401).json({ mensaje: 'Usuario sin contexto de sucursal' });
        return;
      }

      const observacion = typeof req.body?.observacion === 'string' ? req.body.observacion.trim() : undefined;
      const montoRaw = req.body?.monto_declarado;
      const monto_declarado = typeof montoRaw === 'number'
        ? montoRaw
        : typeof montoRaw === 'string'
          ? Number(montoRaw)
          : Number.NaN;
      const codigo_empleado = typeof req.body?.codigo_empleado === 'string' ? req.body.codigo_empleado.trim() : '';

      if (!codigo_empleado) {
        res.status(400).json({ mensaje: 'El código de empleado es requerido para cerrar caja' });
        return;
      }

      if (!Number.isFinite(monto_declarado) || monto_declarado < 0) {
        res.status(400).json({ mensaje: 'El monto contado en caja es requerido y debe ser numérico' });
        return;
      }

      const resumen = await this.cajaCierreService.solicitarCierre(id_usuario, id_sucursal, {
        codigo_empleado,
        observacion,
        monto_declarado,
      });

      res.status(201).json(resumen);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async listarCierres(req: Request, res: Response): Promise<void> {
    try {
      const rol = req.usuario?.rol;
      const id_sucursal = req.usuario?.id_sucursal;

      const estado = typeof req.query?.estado === 'string' ? req.query.estado : undefined;
      const cierres = await this.cajaCierreService.listarCierres({
        estado,
        rol_usuario: rol,
        id_sucursal_usuario: id_sucursal,
      });

      res.json(cierres);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async autorizarCierre(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        res.status(400).json({ mensaje: 'ID de cierre inválido' });
        return;
      }

      const id_usuario_revisor = req.usuario?.id_usuario;
      if (!id_usuario_revisor) {
        res.status(401).json({ mensaje: 'Usuario no autenticado' });
        return;
      }

      const cierre = await this.cajaCierreService.resolverCierre(id, 'AUTORIZADA', id_usuario_revisor);
      res.json(cierre);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async rechazarCierre(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        res.status(400).json({ mensaje: 'ID de cierre inválido' });
        return;
      }

      const motivo_rechazo = typeof req.body?.motivo_rechazo === 'string' ? req.body.motivo_rechazo.trim() : '';
      if (!motivo_rechazo) {
        res.status(400).json({ mensaje: 'El motivo de rechazo es requerido' });
        return;
      }

      const id_usuario_revisor = req.usuario?.id_usuario;
      if (!id_usuario_revisor) {
        res.status(401).json({ mensaje: 'Usuario no autenticado' });
        return;
      }

      const cierre = await this.cajaCierreService.resolverCierre(id, 'RECHAZADA', id_usuario_revisor, motivo_rechazo);
      res.json(cierre);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async reautorizarCierre(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        res.status(400).json({ mensaje: 'ID de cierre inválido' });
        return;
      }

      const id_usuario_revisor = req.usuario?.id_usuario;
      if (!id_usuario_revisor) {
        res.status(401).json({ mensaje: 'Usuario no autenticado' });
        return;
      }

      const cierre = await this.cajaCierreService.reautorizarCierre(id, id_usuario_revisor);
      res.json(cierre);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
}
