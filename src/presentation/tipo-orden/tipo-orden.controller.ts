import { Request, Response } from 'express';
import { TipoOrdenService } from '../../services/tipo-orden.service';
import { validateCrearTipoOrden, validateActualizarTipoOrden } from '../../domain/validators/tipo-orden.validator';
import { AppError } from '../../helpers/app-error';

export class TipoOrdenController {
  constructor(private readonly tipoOrdenService = new TipoOrdenService()) {}

  async listar(req: Request, res: Response): Promise<void> {
    try {
      const tipos = await this.tipoOrdenService.listar();
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
    const id_tipo_orden = parseInt(id as string, 10);
    if (isNaN(id_tipo_orden)) {
      res.status(400).json({ mensaje: 'ID de tipo de orden inválido' });
      return;
    }

    try {
      const tipo = await this.tipoOrdenService.obtenerPorId(id_tipo_orden);
      if (!tipo) {
        res.status(404).json({ mensaje: 'Tipo de orden no encontrado' });
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
    const { data, error } = validateCrearTipoOrden(req.body);
    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    try {
      const tipo = await this.tipoOrdenService.crear(data!);
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
    const id_tipo_orden = parseInt(id as string, 10);
    if (isNaN(id_tipo_orden)) {
      res.status(400).json({ mensaje: 'ID de tipo de orden inválido' });
      return;
    }

    const { data, error } = validateActualizarTipoOrden(req.body);
    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    try {
      const tipo = await this.tipoOrdenService.actualizar(id_tipo_orden, data!);
      res.json(tipo);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async obtenerDependencias(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const id_tipo_orden = parseInt(id as string, 10);
    if (isNaN(id_tipo_orden)) {
      res.status(400).json({ mensaje: 'ID de tipo de orden inválido' });
      return;
    }

    try {
      const dependencias = await this.tipoOrdenService.obtenerDependencias(id_tipo_orden);
      res.json(dependencias);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async eliminar(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const id_tipo_orden = parseInt(id as string, 10);
    if (isNaN(id_tipo_orden)) {
      res.status(400).json({ mensaje: 'ID de tipo de orden inválido' });
      return;
    }

    try {
      await this.tipoOrdenService.eliminar(id_tipo_orden);
      res.json({ mensaje: 'Tipo de orden eliminado correctamente' });
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
}
