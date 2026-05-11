import { Request, Response } from 'express';
import { SucursalService } from '../../services/sucursal.service';
import { validateCrearSucursal, validateActualizarSucursal } from '../../domain/validators/sucursal.validator';
import { AppError } from '../../helpers/app-error';

export class SucursalController {
  constructor(private readonly sucursalService = new SucursalService()) {}

  async listar(req: Request, res: Response): Promise<void> {
    try {
      const soloActivas = req.query.activo === 'true';
      const sucursales = await this.sucursalService.listar(soloActivas);
      res.json(sucursales);
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
    const id_sucursal = parseInt(id as string, 10);
    if (isNaN(id_sucursal)) {
      res.status(400).json({ mensaje: 'ID de sucursal inválido' });
      return;
    }

    try {
      const sucursal = await this.sucursalService.obtenerPorId(id_sucursal);
      if (!sucursal) {
        res.status(404).json({ mensaje: 'Sucursal no encontrada' });
        return;
      }
      res.json(sucursal);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async crear(req: Request, res: Response): Promise<void> {
    const { data, error } = validateCrearSucursal(req.body);
    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    try {
      const sucursal = await this.sucursalService.crear(data!);
      res.status(201).json(sucursal);
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
    const id_sucursal = parseInt(id as string, 10);
    if (isNaN(id_sucursal)) {
      res.status(400).json({ mensaje: 'ID de sucursal inválido' });
      return;
    }

    const { data, error } = validateActualizarSucursal(req.body);
    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    try {
      const sucursal = await this.sucursalService.actualizar(id_sucursal, data!);
      res.json(sucursal);
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
    const id_sucursal = parseInt(id as string, 10);
    if (isNaN(id_sucursal)) {
      res.status(400).json({ mensaje: 'ID de sucursal inválido' });
      return;
    }

    try {
      const dependencias = await this.sucursalService.obtenerDependencias(id_sucursal);
      res.json(dependencias);
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
    const id_sucursal = parseInt(id as string, 10);
    if (isNaN(id_sucursal)) {
      res.status(400).json({ mensaje: 'ID de sucursal inválido' });
      return;
    }

    try {
      const sucursal = await this.sucursalService.activar(id_sucursal);
      res.json(sucursal);
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
    const id_sucursal = parseInt(id as string, 10);
    if (isNaN(id_sucursal)) {
      res.status(400).json({ mensaje: 'ID de sucursal inválido' });
      return;
    }

    try {
      const sucursal = await this.sucursalService.desactivar(id_sucursal);
      res.json(sucursal);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
}
