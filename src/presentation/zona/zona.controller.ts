import { Request, Response } from 'express';
import { ZonaService } from '../../services/zona.service';
import { validateCrearZona, validateActualizarZona } from '../../domain/validators/zona.validator';
import { AppError } from '../../helpers/app-error';

export class ZonaController {
  constructor(private readonly zonaService = new ZonaService()) {}

  async listar(req: Request, res: Response): Promise<void> {
    // Admin puede pasar ?id_sucursal=X; otros roles usan la sucursal del token.
    const fromQuery = parseInt(req.query.id_sucursal as string, 10);
    const id_sucursal = !isNaN(fromQuery) && fromQuery > 0
      ? fromQuery
      : req.usuario!.id_sucursal;

    try {
      const zonas = await this.zonaService.listarPorSucursal(id_sucursal);
      res.json(zonas);
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
    const id_zona = parseInt(id as string, 10);
    if (isNaN(id_zona)) {
      res.status(400).json({ mensaje: 'ID de zona inválido' });
      return;
    }

    try {
      const zona = await this.zonaService.obtenerPorId(id_zona);
      if (!zona) {
        res.status(404).json({ mensaje: 'Zona no encontrada' });
        return;
      }
      res.json(zona);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async crear(req: Request, res: Response): Promise<void> {
    const { data, error } = validateCrearZona(req.body);
    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    try {
      const zona = await this.zonaService.crear(data!);
      res.status(201).json(zona);
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
    const id_zona = parseInt(id as string, 10);
    if (isNaN(id_zona)) {
      res.status(400).json({ mensaje: 'ID de zona inválido' });
      return;
    }

    const { data, error } = validateActualizarZona(req.body);
    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    try {
      const zona = await this.zonaService.actualizar(id_zona, data!);
      res.json(zona);
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
    const id_zona = parseInt(id as string, 10);
    if (isNaN(id_zona)) {
      res.status(400).json({ mensaje: 'ID de zona inválido' });
      return;
    }

    try {
      const zona = await this.zonaService.desactivar(id_zona);
      res.json(zona);
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
    const id_zona = parseInt(id as string, 10);
    if (isNaN(id_zona)) {
      res.status(400).json({ mensaje: 'ID de zona inválido' });
      return;
    }

    try {
      const zona = await this.zonaService.activar(id_zona);
      res.json(zona);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
}
