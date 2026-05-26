import { Request, Response } from 'express';
import { CategoriaService } from '../../services/categoria.service';
import { AppError } from '../../helpers/app-error';
import { validateCrearCategoria, validateActualizarCategoria } from '../../domain/validators/categoria.validator';

export class CategoriaController {
  constructor(private readonly service = new CategoriaService()) {}

  async listar(_req: Request, res: Response): Promise<void> {
    try {
      const categorias = await this.service.listar();
      res.json(categorias);
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async crear(req: Request, res: Response): Promise<void> {
    const { data, error } = validateCrearCategoria(req.body);
    if (error) { res.status(400).json({ mensaje: error }); return; }

    try {
      const categoria = await this.service.crear(data!);
      res.status(201).json(categoria);
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async actualizar(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params['id'] as string, 10);
    if (isNaN(id)) { res.status(400).json({ mensaje: 'ID de categoría inválido' }); return; }

    const { data, error } = validateActualizarCategoria(req.body);
    if (error) { res.status(400).json({ mensaje: error }); return; }

    try {
      const categoria = await this.service.actualizar(id, data!);
      res.json(categoria);
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async verificarProductosActivos(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params['id'] as string, 10);
    if (isNaN(id)) { res.status(400).json({ mensaje: 'ID de categoría inválido' }); return; }

    try {
      const resultado = await this.service.verificarProductosActivos(id);
      res.json(resultado);
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async desactivar(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params['id'] as string, 10);
    if (isNaN(id)) { res.status(400).json({ mensaje: 'ID de categoría inválido' }); return; }

    try {
      const categoria = await this.service.desactivar(id);
      res.json(categoria);
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async activar(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params['id'] as string, 10);
    if (isNaN(id)) { res.status(400).json({ mensaje: 'ID de categoría inválido' }); return; }

    try {
      const categoria = await this.service.activar(id);
      res.json(categoria);
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
}
