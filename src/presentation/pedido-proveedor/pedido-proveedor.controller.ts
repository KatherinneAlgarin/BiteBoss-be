import { Request, Response } from 'express';
import { AppError } from '../../helpers/app-error';
import { PedidoProveedorService } from '../../services/pedido-proveedor.service';
import { validateCrearPedidoProveedor, validateEditarPedidoProveedor } from '../../domain/validators/pedido-proveedor.validator';

export class PedidoProveedorController {
  constructor(private readonly service = new PedidoProveedorService()) {}

  async listar(req: Request, res: Response): Promise<void> {
    try {
      const usuario = (req as any).usuario;
      const isAdmin = usuario?.rol === 'admin';

      const id_sucursal = isAdmin
        ? (req.query.id_sucursal ? Number(req.query.id_sucursal) : undefined)
        : usuario?.id_sucursal;

      const id_proveedor = req.query.id_proveedor ? Number(req.query.id_proveedor) : undefined;

      const pedidos = await this.service.listar({ id_sucursal, id_proveedor });
      res.json(pedidos);
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async obtener(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) { res.status(400).json({ mensaje: 'ID inválido' }); return; }
      const pedido = await this.service.obtenerConDetalle(id);
      res.json(pedido);
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async crear(req: Request, res: Response): Promise<void> {
    const usuario = (req as any).usuario;
    const isAdmin = usuario?.rol === 'admin';

    const body = { ...req.body };
    if (!isAdmin) body.id_sucursal = usuario?.id_sucursal;

    const { data, error } = validateCrearPedidoProveedor(body);
    if (error) { res.status(400).json({ mensaje: error }); return; }

    const id_usuario_sucursal = usuario?.id_usuario_sucursal;
    if (!id_usuario_sucursal) { res.status(401).json({ mensaje: 'Usuario no autenticado' }); return; }

    try {
      const pedido = await this.service.crear(data!, id_usuario_sucursal);
      res.status(201).json(pedido);
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async actualizar(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ mensaje: 'ID inválido' }); return; }

    const { data, error } = validateEditarPedidoProveedor(req.body);
    if (error) { res.status(400).json({ mensaje: error }); return; }

    const id_usuario = (req as any).usuario?.id_usuario;
    if (!id_usuario) { res.status(401).json({ mensaje: 'Usuario no autenticado' }); return; }

    try {
      const pedido = await this.service.actualizar(id, data!, id_usuario);
      res.json(pedido);
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
}
