import { Request, Response } from 'express';
import { ReservacionService } from '../../services/reservacion.service';
import { validateCrearReservacion, validateActualizarReservacion } from '../../domain/validators/reservacion.validator';
import { AppError } from '../../helpers/app-error';
import type { EstadoReservacion } from '../../domain/interfaces/reservacion.interface';

const ESTADOS_VALIDOS: EstadoReservacion[] = ['pendiente', 'cancelada', 'completada'];

export class ReservacionController {
  constructor(private readonly reservacionService = new ReservacionService()) {}

  async listar(req: Request, res: Response): Promise<void> {
    const id_sucursal = req.usuario!.id_sucursal;
    const { estado: estadoParam, fecha: fechaParam, zona: zonaParam } = req.query;

    let estado: EstadoReservacion | undefined;
    if (typeof estadoParam === 'string' && ESTADOS_VALIDOS.includes(estadoParam as EstadoReservacion)) {
      estado = estadoParam as EstadoReservacion;
    }

    let fecha: string | undefined;
    if (typeof fechaParam === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam)) {
      fecha = fechaParam;
    }

    let id_zona: number | undefined;
    if (typeof zonaParam === 'string') {
      const parsed = parseInt(zonaParam, 10);
      if (!isNaN(parsed) && parsed > 0) id_zona = parsed;
    }

    try {
      const reservaciones = await this.reservacionService.listar(id_sucursal, estado, fecha, id_zona);
      res.json(reservaciones);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async crear(req: Request, res: Response): Promise<void> {
    const { data, error } = validateCrearReservacion(req.body);
    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    const { id_usuario_sucursal, id_sucursal } = req.usuario!;

    if (!id_usuario_sucursal) {
      res.status(403).json({ mensaje: 'El usuario no tiene sucursal asignada' });
      return;
    }

    try {
      const reservacion = await this.reservacionService.crear(data!, id_usuario_sucursal, id_sucursal);
      res.status(201).json(reservacion);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async actualizar(req: Request, res: Response): Promise<void> {
    const id_reservacion = parseInt(req.params.id as string, 10);
    if (isNaN(id_reservacion) || id_reservacion <= 0) {
      res.status(400).json({ mensaje: 'ID de reservación inválido' });
      return;
    }

    const { data, error } = validateActualizarReservacion(req.body);
    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    try {
      const reservacion = await this.reservacionService.actualizar(id_reservacion, data!, req.usuario!.id_sucursal);
      res.json(reservacion);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async cancelar(req: Request, res: Response): Promise<void> {
    const id_reservacion = parseInt(req.params.id as string, 10);
    if (isNaN(id_reservacion) || id_reservacion <= 0) {
      res.status(400).json({ mensaje: 'ID de reservación inválido' });
      return;
    }

    try {
      await this.reservacionService.cancelar(id_reservacion, req.usuario!.id_sucursal);
      res.json({ mensaje: 'Reservación cancelada correctamente' });
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async reactivar(req: Request, res: Response): Promise<void> {
    const id_reservacion = parseInt(req.params.id as string, 10);
    if (isNaN(id_reservacion) || id_reservacion <= 0) {
      res.status(400).json({ mensaje: 'ID de reservación inválido' });
      return;
    }

    try {
      await this.reservacionService.reactivar(id_reservacion, req.usuario!.id_sucursal);
      res.json({ mensaje: 'Reservación reactivada correctamente' });
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async completar(req: Request, res: Response): Promise<void> {
    const id_reservacion = parseInt(req.params.id as string, 10);
    if (isNaN(id_reservacion) || id_reservacion <= 0) {
      res.status(400).json({ mensaje: 'ID de reservación inválido' });
      return;
    }

    try {
      await this.reservacionService.completar(id_reservacion, req.usuario!.id_sucursal);
      res.json({ mensaje: 'Reservación completada correctamente' });
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
}
