import { Request, Response } from 'express';
import { AppError } from '../../helpers/app-error';
import { InventarioService } from '../../services/inventario.service';

export class InventarioController {
  constructor(private readonly inventarioService = new InventarioService()) {}

  private resolverSucursal(req: Request): number | undefined {
    const querySucursal = req.query.id_sucursal;
    const idSucursalQuery =
      typeof querySucursal === 'string' && querySucursal.trim().length > 0
        ? Number(querySucursal)
        : undefined;
    if (idSucursalQuery !== undefined && Number.isNaN(idSucursalQuery)) return undefined;
    return idSucursalQuery ?? req.usuario?.id_sucursal;
  }

  async listarStockActual(req: Request, res: Response): Promise<void> {
    try {
      const id_sucursal = this.resolverSucursal(req);
      res.json(await this.inventarioService.listarStockActualProductos(id_sucursal));
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async listarStockIngredientes(req: Request, res: Response): Promise<void> {
    try {
      const id_sucursal = this.resolverSucursal(req);
      res.json(await this.inventarioService.listarStockActualIngredientes(id_sucursal));
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async registrarStockIngrediente(req: Request, res: Response): Promise<void> {
    try {
      const { id_ingrediente, id_bodega, cantidad, stock_minimo, stock_maximo } = req.body;
      if (!id_ingrediente || !id_bodega || cantidad === undefined || stock_minimo === undefined || stock_maximo === undefined) {
        res.status(400).json({ mensaje: 'Faltan campos requeridos' }); return;
      }
      if (Number(cantidad) <= 0) { res.status(400).json({ mensaje: 'La cantidad debe ser mayor a 0' }); return; }
      if (Number(stock_minimo) < 0) { res.status(400).json({ mensaje: 'El stock mínimo debe ser ≥ 0' }); return; }
      if (Number(stock_maximo) < Number(stock_minimo)) { res.status(400).json({ mensaje: 'El stock máximo debe ser ≥ al mínimo' }); return; }

      const id_usuario = (req as any).usuario?.id_usuario;
      if (!id_usuario) { res.status(401).json({ mensaje: 'Usuario no autenticado' }); return; }

      await this.inventarioService.registrarStockIngrediente(
        { id_ingrediente: Number(id_ingrediente), id_bodega: Number(id_bodega), cantidad: Number(cantidad), stock_minimo: Number(stock_minimo), stock_maximo: Number(stock_maximo) },
        id_usuario
      );
      res.status(201).json({ mensaje: 'Stock registrado correctamente' });
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async ajustarStock(req: Request, res: Response): Promise<void> {
    try {
      const id_inventario = Number(req.params.id as string);
      const { tipo, cantidad } = req.body;
      if (!tipo || cantidad === undefined) { res.status(400).json({ mensaje: 'Faltan campos requeridos: tipo, cantidad' }); return; }
      if (!['AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO'].includes(tipo)) { res.status(400).json({ mensaje: 'Tipo inválido' }); return; }
      if (Number(cantidad) <= 0) { res.status(400).json({ mensaje: 'La cantidad debe ser mayor a 0' }); return; }

      const id_usuario = (req as any).usuario?.id_usuario;
      if (!id_usuario) { res.status(401).json({ mensaje: 'Usuario no autenticado' }); return; }

      await this.inventarioService.ajustarStock(id_inventario, { tipo, cantidad: Number(cantidad) }, id_usuario);
      res.json({ mensaje: 'Stock ajustado correctamente' });
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async transferirStock(req: Request, res: Response): Promise<void> {
    try {
      const id_inventario = Number(req.params.id as string);
      const { id_bodega_destino, cantidad } = req.body;
      if (!id_bodega_destino || cantidad === undefined) { res.status(400).json({ mensaje: 'Faltan campos requeridos: id_bodega_destino, cantidad' }); return; }
      if (Number(cantidad) <= 0) { res.status(400).json({ mensaje: 'La cantidad debe ser mayor a 0' }); return; }
      const id_usuario = (req as any).usuario?.id_usuario;
      if (!id_usuario) { res.status(401).json({ mensaje: 'Usuario no autenticado' }); return; }
      await this.inventarioService.transferirStock(id_inventario, { id_bodega_destino: Number(id_bodega_destino), cantidad: Number(cantidad) }, id_usuario);
      res.json({ mensaje: 'Stock transferido correctamente' });
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async actualizarLimites(req: Request, res: Response): Promise<void> {
    try {
      const id_inventario = Number(req.params.id as string);
      const { stock_minimo, stock_maximo } = req.body;
      if (stock_minimo === undefined || stock_maximo === undefined) { res.status(400).json({ mensaje: 'Faltan campos requeridos' }); return; }
      if (Number(stock_minimo) < 0) { res.status(400).json({ mensaje: 'El stock mínimo debe ser ≥ 0' }); return; }
      if (Number(stock_maximo) < Number(stock_minimo)) { res.status(400).json({ mensaje: 'El stock máximo debe ser ≥ al mínimo' }); return; }

      await this.inventarioService.actualizarLimites(id_inventario, { stock_minimo: Number(stock_minimo), stock_maximo: Number(stock_maximo) });
      res.json({ mensaje: 'Límites actualizados correctamente' });
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
}
