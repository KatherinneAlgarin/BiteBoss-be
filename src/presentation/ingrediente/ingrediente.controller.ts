import { Request, Response } from 'express';
import { IngredienteService } from '../../services/ingrediente.service';
import { validateCrearIngrediente, validateActualizarIngrediente } from '../../domain/validators/ingrediente.validator';
import { AppError } from '../../helpers/app-error';

export class IngredienteController {
  constructor(private readonly ingredienteService = new IngredienteService()) {}

  async listar(_req: Request, res: Response): Promise<void> {
    try {
      const ingredientes = await this.ingredienteService.listar();
      res.json(ingredientes);
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async obtener(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ mensaje: 'ID de ingrediente inválido' }); return; }

    try {
      const ingrediente = await this.ingredienteService.obtenerPorId(id);
      if (!ingrediente) { res.status(404).json({ mensaje: 'Ingrediente no encontrado' }); return; }
      res.json(ingrediente);
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async crear(req: Request, res: Response): Promise<void> {
    const { data, error } = validateCrearIngrediente(req.body);
    if (error) { res.status(400).json({ mensaje: error }); return; }

    const id_usuario = (req as any).usuario?.id_usuario;
    if (!id_usuario) { res.status(401).json({ mensaje: 'Usuario no autenticado' }); return; }

    try {
      const ingrediente = await this.ingredienteService.crear(data!, id_usuario);
      res.status(201).json(ingrediente);
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async actualizar(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ mensaje: 'ID de ingrediente inválido' }); return; }

    const { data, error } = validateActualizarIngrediente(req.body);
    if (error) { res.status(400).json({ mensaje: error }); return; }

    try {
      const ingrediente = await this.ingredienteService.actualizar(id, data!);
      res.json(ingrediente);
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async activar(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ mensaje: 'ID de ingrediente inválido' }); return; }

    try {
      const ingrediente = await this.ingredienteService.activar(id);
      res.json(ingrediente);
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async desactivar(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ mensaje: 'ID de ingrediente inválido' }); return; }

    try {
      const ingrediente = await this.ingredienteService.desactivar(id);
      res.json(ingrediente);
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async verificarEnUso(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { res.status(400).json({ mensaje: 'ID de ingrediente inválido' }); return; }

    try {
      const resultado = await this.ingredienteService.verificarEnUso(id);
      res.json(resultado);
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
}
