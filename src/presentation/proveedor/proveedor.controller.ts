import { Request, Response } from 'express';
import { ProveedorService } from '../../services/proveedor.service';
import { validateCrearProveedor, validateActualizarProveedor } from '../../domain/validators/proveedor.validator';
import { AppError } from '../../helpers/app-error';

export class ProveedorController {
  constructor(private readonly proveedorService = new ProveedorService()) {}

  async listarProveedores(req: Request, res: Response): Promise<void> {
    try {
      const proveedores = await this.proveedorService.listarProveedores();
      res.json(proveedores);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async obtenerProveedor(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const id_proveedor = parseInt(id as string, 10);
      if (isNaN(id_proveedor)) {
        res.status(400).json({ mensaje: 'ID de proveedor inválido' });
        return;
      }

      const proveedor = await this.proveedorService.obtenerProveedorPorId(id_proveedor);
      if (!proveedor) {
        res.status(404).json({ mensaje: 'Proveedor no encontrado' });
        return;
      }

      res.json(proveedor);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async crearProveedor(req: Request, res: Response): Promise<void> {
    const { data, error } = validateCrearProveedor(req.body);
    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    try {
      const proveedor = await this.proveedorService.crearProveedor(data!);
      res.status(201).json(proveedor);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async actualizarProveedor(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const id_proveedor = parseInt(id as string, 10);
    if (isNaN(id_proveedor)) {
      res.status(400).json({ mensaje: 'ID de proveedor inválido' });
      return;
    }

    const { data, error } = validateActualizarProveedor(req.body);
    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    try {
      const proveedor = await this.proveedorService.actualizarProveedor(id_proveedor, data!);
      res.json(proveedor);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async eliminarProveedor(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const id_proveedor = parseInt(id as string, 10);
    if (isNaN(id_proveedor)) {
      res.status(400).json({ mensaje: 'ID de proveedor inválido' });
      return;
    }

    try {
      await this.proveedorService.eliminarProveedor(id_proveedor);
      res.json({ mensaje: 'Proveedor eliminado correctamente' });
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
}
