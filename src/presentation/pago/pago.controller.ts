import { Request, Response } from 'express';
import { PagoService } from '../../services/pago.service';
import { validateCrearPago } from '../../domain/validators/pago.validator';
import { AppError } from '../../helpers/app-error';

export class PagoController {
  constructor(private readonly pagoService = new PagoService()) {}

  async listarMetodosPago(req: Request, res: Response): Promise<void> {
    try {
      const id_sucursal = req.usuario?.id_sucursal!;
      const metodos = await this.pagoService.listarMetodosPago(id_sucursal);
      res.json(metodos);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async crearPago(req: Request, res: Response): Promise<void> {
    const { data, error } = validateCrearPago(req.body);
    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    try {
      const pago = await this.pagoService.crearPago(data!);
      res.status(201).json(pago);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async listarPagosOrden(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const id_orden = parseInt(id as string, 10);
      if (isNaN(id_orden)) {
        res.status(400).json({ mensaje: 'ID de orden inválido' });
        return;
      }

      const pagos = await this.pagoService.listarPagosOrden(id_orden);
      res.json(pagos);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async actualizarEstadoPago(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const id_pago = parseInt(id as string, 10);
    if (isNaN(id_pago)) {
      res.status(400).json({ mensaje: 'ID de pago inválido' });
      return;
    }

    const { estado } = req.body;
    if (!estado || typeof estado !== 'string') {
      res.status(400).json({ mensaje: 'Estado requerido' });
      return;
    }

    try {
      const pago = await this.pagoService.actualizarEstadoPago(id_pago, estado);
      res.json(pago);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
}