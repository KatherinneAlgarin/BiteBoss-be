import { Request, Response } from 'express';
import { TipoPagoService } from '../../services/tipo-pago.service';
import { AppError } from '../../helpers/app-error';
import { validateCrearTipoPago, validateActualizarTipoPago } from '../../domain/validators/tipo-pago.validator';

export class TipoPagoController {
  constructor(private readonly tipoPagoService = new TipoPagoService()) {}

  async listar(_req: Request, res: Response): Promise<void> {
    try {
      const tipos = await this.tipoPagoService.listar();
      res.json(tipos);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async obtener(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const id_tipo_pago = parseInt(id as string, 10);
    if (isNaN(id_tipo_pago)) {
      res.status(400).json({ mensaje: 'ID de método de pago inválido' });
      return;
    }

    try {
      const tipo = await this.tipoPagoService.obtenerPorId(id_tipo_pago);
      if (!tipo) {
        res.status(404).json({ mensaje: 'Método de pago no encontrado' });
        return;
      }
      res.json(tipo);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async crear(req: Request, res: Response): Promise<void> {
    const { data, error } = validateCrearTipoPago(req.body);
    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    try {
      const tipo = await this.tipoPagoService.crear(data!, {
        id_usuario: req.usuario?.id_usuario,
        email: req.usuario?.email ?? 'sistema',
      });
      res.status(201).json(tipo);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async actualizar(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const id_tipo_pago = parseInt(id as string, 10);
    if (isNaN(id_tipo_pago)) {
      res.status(400).json({ mensaje: 'ID de método de pago inválido' });
      return;
    }

    const { data, error } = validateActualizarTipoPago(req.body);
    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    try {
      const tipo = await this.tipoPagoService.actualizar(id_tipo_pago, data!, {
        id_usuario: req.usuario?.id_usuario,
        email: req.usuario?.email ?? 'sistema',
      });
      res.json(tipo);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async obtenerDependenciasDesactivacion(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const id_tipo_pago = parseInt(id as string, 10);
    if (isNaN(id_tipo_pago)) {
      res.status(400).json({ mensaje: 'ID de método de pago inválido' });
      return;
    }

    try {
      const dependencias = await this.tipoPagoService.obtenerDependenciasDesactivacion(id_tipo_pago);
      res.json(dependencias);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async desactivar(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const id_tipo_pago = parseInt(id as string, 10);
    if (isNaN(id_tipo_pago)) {
      res.status(400).json({ mensaje: 'ID de método de pago inválido' });
      return;
    }

    try {
      const tipo = await this.tipoPagoService.desactivar(id_tipo_pago, {
        id_usuario: req.usuario?.id_usuario,
        email: req.usuario?.email ?? 'sistema',
      });
      res.json(tipo);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async activar(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const id_tipo_pago = parseInt(id as string, 10);
    if (isNaN(id_tipo_pago)) {
      res.status(400).json({ mensaje: 'ID de método de pago inválido' });
      return;
    }

    try {
      const tipo = await this.tipoPagoService.activar(id_tipo_pago, {
        id_usuario: req.usuario?.id_usuario,
        email: req.usuario?.email ?? 'sistema',
      });
      res.json(tipo);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
}
