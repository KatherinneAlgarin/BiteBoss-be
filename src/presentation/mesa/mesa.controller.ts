import { Request, Response } from 'express';
import { MesaService } from '../../services/mesa.service';
import { validateCrearMesa, validateActualizarMesa } from '../../domain/validators/mesa.validator';
import { AppError } from '../../helpers/app-error';

export class MesaController {
  constructor(private readonly mesaService = new MesaService()) {}

  async listar(req: Request, res: Response): Promise<void> {
    const id_zona = parseInt(req.query.id_zona as string, 10);
    if (isNaN(id_zona) || id_zona <= 0) {
      res.status(400).json({ mensaje: 'Debe indicar id_zona en la consulta' });
      return;
    }

    try {
      const mesas = await this.mesaService.listarPorZona(id_zona);
      res.json(mesas);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async obtener(req: Request, res: Response): Promise<void> {
    const id_mesa = parseInt(req.params.id as string, 10);
    if (isNaN(id_mesa)) {
      res.status(400).json({ mensaje: 'ID de mesa inválido' });
      return;
    }

    try {
      const mesa = await this.mesaService.obtenerPorId(id_mesa);
      if (!mesa) {
        res.status(404).json({ mensaje: 'Mesa no encontrada' });
        return;
      }
      res.json(mesa);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async crear(req: Request, res: Response): Promise<void> {
    const { data, error } = validateCrearMesa(req.body);
    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    try {
      const mesa = await this.mesaService.crear(data!);
      res.status(201).json(mesa);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async actualizar(req: Request, res: Response): Promise<void> {
    const id_mesa = parseInt(req.params.id as string, 10);
    if (isNaN(id_mesa)) {
      res.status(400).json({ mensaje: 'ID de mesa inválido' });
      return;
    }

    const { data, error } = validateActualizarMesa(req.body);
    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    try {
      const mesa = await this.mesaService.actualizar(id_mesa, data!);
      res.json(mesa);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async desactivar(req: Request, res: Response): Promise<void> {
    const id_mesa = parseInt(req.params.id as string, 10);
    if (isNaN(id_mesa)) {
      res.status(400).json({ mensaje: 'ID de mesa inválido' });
      return;
    }

    try {
      const mesa = await this.mesaService.desactivar(id_mesa);
      res.json(mesa);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async activar(req: Request, res: Response): Promise<void> {
    const id_mesa = parseInt(req.params.id as string, 10);
    if (isNaN(id_mesa)) {
      res.status(400).json({ mensaje: 'ID de mesa inválido' });
      return;
    }

    try {
      const mesa = await this.mesaService.activar(id_mesa);
      res.json(mesa);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
}
