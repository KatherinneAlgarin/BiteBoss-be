import { Request, Response } from 'express';
import { BodegaService } from '../../services/bodega.service';
import { validateCrearBodega, validateActualizarBodega } from '../../domain/validators/bodega.validator';
import { AppError } from '../../helpers/app-error';

export class BodegaController {
  constructor(private readonly bodegaService = new BodegaService()) {}

  async listar(req: Request, res: Response): Promise<void> {
    try {
      const id_sucursal = req.query.id_sucursal ? parseInt(req.query.id_sucursal as string, 10) : undefined;
      const bodegas = await this.bodegaService.listar(id_sucursal);
      res.json(bodegas);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async obtener(req: Request, res: Response): Promise<void> {
    const id_bodega = parseInt(req.params.id as string, 10);
    if (isNaN(id_bodega)) {
      res.status(400).json({ mensaje: 'ID de bodega inválido' });
      return;
    }

    try {
      const bodega = await this.bodegaService.obtenerPorId(id_bodega);
      if (!bodega) {
        res.status(404).json({ mensaje: 'Bodega no encontrada' });
        return;
      }
      res.json(bodega);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async crear(req: Request, res: Response): Promise<void> {
    const { data, error } = validateCrearBodega(req.body);
    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    try {
      const bodega = await this.bodegaService.crear(data!);
      res.status(201).json(bodega);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async actualizar(req: Request, res: Response): Promise<void> {
    const id_bodega = parseInt(req.params.id as string, 10);
    if (isNaN(id_bodega)) {
      res.status(400).json({ mensaje: 'ID de bodega inválido' });
      return;
    }

    const { data, error } = validateActualizarBodega(req.body);
    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    try {
      const bodega = await this.bodegaService.actualizar(id_bodega, data!);
      res.json(bodega);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async desactivar(req: Request, res: Response): Promise<void> {
    const id_bodega = parseInt(req.params.id as string, 10);
    if (isNaN(id_bodega)) {
      res.status(400).json({ mensaje: 'ID de bodega inválido' });
      return;
    }

    try {
      const bodega = await this.bodegaService.desactivar(id_bodega);
      res.json(bodega);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async activar(req: Request, res: Response): Promise<void> {
    const id_bodega = parseInt(req.params.id as string, 10);
    if (isNaN(id_bodega)) {
      res.status(400).json({ mensaje: 'ID de bodega inválido' });
      return;
    }

    try {
      const bodega = await this.bodegaService.activar(id_bodega);
      res.json(bodega);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async verificarStock(req: Request, res: Response): Promise<void> {
    const id_bodega = parseInt(req.params.id as string, 10);
    if (isNaN(id_bodega)) {
      res.status(400).json({ mensaje: 'ID de bodega inválido' });
      return;
    }

    try {
      const resultado = await this.bodegaService.verificarStock(id_bodega);
      res.json(resultado);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
}
