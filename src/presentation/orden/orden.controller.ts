import { Request, Response } from 'express';
import { OrdenService } from '../../services/orden.service';
import { validateCrearOrden, validateActualizarOrden, validateCrearOrdenDetalle, validateActualizarOrdenDetalle } from '../../domain/validators/orden.validator';
import { AppError } from '../../helpers/app-error';

export class OrdenController {
  constructor(private readonly ordenService = new OrdenService()) {}

  async crearOrden(req: Request, res: Response): Promise<void> {
    const { data, error } = validateCrearOrden(req.body);
    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    try {
      const id_usuario = req.usuario!.id_usuario!;
      const orden = await this.ordenService.crearOrden(data!, id_usuario, {
        rol: req.usuario?.rol,
        id_sucursal: req.usuario?.id_sucursal,
      });
      res.status(201).json(orden);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async listarOrdenes(req: Request, res: Response): Promise<void> {
    try {
      const { estado } = req.query;
      const id_sucursal = req.usuario?.id_sucursal;
      const ordenes = await this.ordenService.listarOrdenes(id_sucursal, estado as string);
      res.json(ordenes);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async obtenerOrden(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const id_pedido = parseInt(id as string, 10);
      if (isNaN(id_pedido)) {
        res.status(400).json({ mensaje: 'ID de pedido inválido' });
        return;
      }

      const orden = await this.ordenService.obtenerOrdenPorId(id_pedido);
      if (!orden) {
        res.status(404).json({ mensaje: 'Pedido no encontrado' });
        return;
      }

      const detalles = await this.ordenService.obtenerDetallesOrden(id_pedido);
      res.json({ ...orden, detalles });
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async actualizarOrden(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const id_pedido = parseInt(id as string, 10);
    if (isNaN(id_pedido)) {
      res.status(400).json({ mensaje: 'ID de pedido inválido' });
      return;
    }

    const { data, error } = validateActualizarOrden(req.body);
    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    try {
      const orden = await this.ordenService.actualizarOrden(id_pedido, data!);
      res.json(orden);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async cancelarOrden(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const id_pedido = parseInt(id as string, 10);
    if (isNaN(id_pedido)) {
      res.status(400).json({ mensaje: 'ID de pedido inválido' });
      return;
    }

    try {
      await this.ordenService.cancelarOrden(id_pedido);
      res.status(204).send();
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async agregarDetalle(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const id_pedido = parseInt(id as string, 10);
    if (isNaN(id_pedido)) {
      res.status(400).json({ mensaje: 'ID de pedido inválido' });
      return;
    }

    const { data, error } = validateCrearOrdenDetalle(req.body);
    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    try {
      const id_usuario = req.usuario!.id_usuario!;
      const detalle = await this.ordenService.agregarDetalleOrden(id_pedido, data!.id_producto, data!.cantidad, data!.nota, id_usuario);
      res.status(201).json(detalle);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async actualizarDetalle(req: Request, res: Response): Promise<void> {
    const { id, detalleId } = req.params;
    const id_pedido = parseInt(id as string, 10);
    const id_detalle = parseInt(detalleId as string, 10);
    if (isNaN(id_pedido) || isNaN(id_detalle)) {
      res.status(400).json({ mensaje: 'IDs inválidos' });
      return;
    }

    const { data, error } = validateActualizarOrdenDetalle(req.body);
    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    try {
      const detalle = await this.ordenService.actualizarDetalleOrden(id_detalle, data!);
      res.json(detalle);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async removerDetalle(req: Request, res: Response): Promise<void> {
    const { id, detalleId } = req.params;
    const id_pedido = parseInt(id as string, 10);
    const id_detalle = parseInt(detalleId as string, 10);
    if (isNaN(id_pedido) || isNaN(id_detalle)) {
      res.status(400).json({ mensaje: 'IDs inválidos' });
      return;
    }

    try {
      await this.ordenService.removerDetalleOrden(id_detalle);
      res.status(204).send();
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
}