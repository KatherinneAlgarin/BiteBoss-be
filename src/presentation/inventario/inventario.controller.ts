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

  async listarMovimientos(req: Request, res: Response): Promise<void> {
    try {
      const usuario = req.usuario;
      if (!usuario?.rol) {
        res.status(401).json({ mensaje: 'Usuario no autenticado' });
        return;
      }

      const id_sucursal = this.resolverSucursal(req);
      if (!id_sucursal || !Number.isFinite(Number(id_sucursal))) {
        res.status(400).json({ mensaje: 'Sucursal inválida' });
        return;
      }

      const id_ingrediente = req.query.id_ingrediente ? Number(req.query.id_ingrediente) : undefined;
      const id_bodega = req.query.id_bodega ? Number(req.query.id_bodega) : undefined;
      const id_usuario = req.query.id_usuario ? Number(req.query.id_usuario) : undefined;
      const desde = typeof req.query.desde === 'string' ? req.query.desde : undefined;
      const hasta = typeof req.query.hasta === 'string' ? req.query.hasta : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;

      if (id_ingrediente !== undefined && (!Number.isFinite(id_ingrediente) || id_ingrediente <= 0)) {
        res.status(400).json({ mensaje: 'id_ingrediente inválido' });
        return;
      }
      if (id_bodega !== undefined && (!Number.isFinite(id_bodega) || id_bodega <= 0)) {
        res.status(400).json({ mensaje: 'id_bodega inválido' });
        return;
      }
      if (id_usuario !== undefined && (!Number.isFinite(id_usuario) || id_usuario <= 0)) {
        res.status(400).json({ mensaje: 'id_usuario inválido' });
        return;
      }
      if (limit !== undefined && (!Number.isFinite(limit) || limit <= 0 || limit > 500)) {
        res.status(400).json({ mensaje: 'limit inválido (1-500)' });
        return;
      }

      const movimientos = await this.inventarioService.listarMovimientos(
        {
          id_sucursal: Number(id_sucursal),
          id_ingrediente,
          id_bodega,
          id_usuario,
          desde,
          hasta,
          limit,
        },
        { rol: usuario.rol, id_sucursal: usuario.id_sucursal }
      );

      res.json(movimientos);
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async registrarStockIngrediente(req: Request, res: Response): Promise<void> {
    try {
      const { id_ingrediente, id_bodega, cantidad, stock_minimo, stock_maximo, lote, fecha_vencimiento } = req.body;
      if (!id_ingrediente || !id_bodega || cantidad === undefined || stock_minimo === undefined || stock_maximo === undefined) {
        res.status(400).json({ mensaje: 'Faltan campos requeridos' }); return;
      }
      if (Number(cantidad) <= 0) { res.status(400).json({ mensaje: 'La cantidad debe ser mayor a 0' }); return; }
      if (Number(stock_minimo) < 0) { res.status(400).json({ mensaje: 'El stock mínimo debe ser ≥ 0' }); return; }
      if (Number(stock_maximo) < Number(stock_minimo)) { res.status(400).json({ mensaje: 'El stock máximo debe ser ≥ al mínimo' }); return; }

      const id_usuario = (req as any).usuario?.id_usuario;
      if (!id_usuario) { res.status(401).json({ mensaje: 'Usuario no autenticado' }); return; }

      await this.inventarioService.registrarStockIngrediente(
        {
          id_ingrediente: Number(id_ingrediente),
          id_bodega: Number(id_bodega),
          cantidad: Number(cantidad),
          stock_minimo: Number(stock_minimo),
          stock_maximo: Number(stock_maximo),
          lote: typeof lote === 'string' && lote.trim().length > 0 ? lote.trim() : undefined,
          fecha_vencimiento: typeof fecha_vencimiento === 'string' && fecha_vencimiento.trim().length > 0 ? fecha_vencimiento : undefined,
        },
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
      const { nueva_cantidad, nota } = req.body;
      if (!Number.isFinite(id_inventario) || id_inventario <= 0) {
        res.status(400).json({ mensaje: 'ID de inventario inválido' });
        return;
      }
      if (nueva_cantidad === undefined || nota === undefined) {
        res.status(400).json({ mensaje: 'Faltan campos requeridos: nueva_cantidad, nota' });
        return;
      }
      if (!Number.isFinite(Number(nueva_cantidad)) || Number(nueva_cantidad) < 0) {
        res.status(400).json({ mensaje: 'La nueva cantidad debe ser un número mayor o igual a 0' });
        return;
      }
      if (typeof nota !== 'string' || nota.trim().length < 10) {
        res.status(400).json({ mensaje: 'La nota es obligatoria y debe tener al menos 10 caracteres' });
        return;
      }

      const usuario = req.usuario;
      if (!usuario?.id_usuario || !usuario.rol) { res.status(401).json({ mensaje: 'Usuario no autenticado' }); return; }

      await this.inventarioService.ajustarStock(
        id_inventario,
        { nueva_cantidad: Number(nueva_cantidad), nota: nota.trim() },
        {
          id_usuario: usuario.id_usuario,
          rol: usuario.rol,
          id_sucursal: usuario.id_sucursal,
        }
      );
      res.json({ mensaje: 'Stock ajustado correctamente' });
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async descartarStock(req: Request, res: Response): Promise<void> {
    try {
      const id_inventario = Number(req.params.id as string);
      const { nota } = req.body;

      if (!Number.isFinite(id_inventario) || id_inventario <= 0) {
        res.status(400).json({ mensaje: 'ID de inventario inválido' });
        return;
      }

      if (typeof nota !== 'string' || nota.trim().length < 10) {
        res.status(400).json({ mensaje: 'La nota es obligatoria y debe tener al menos 10 caracteres' });
        return;
      }

      const usuario = req.usuario;
      if (!usuario?.id_usuario || !usuario.rol) {
        res.status(401).json({ mensaje: 'Usuario no autenticado' });
        return;
      }

      await this.inventarioService.descartarStockIngrediente(
        id_inventario,
        { nota: nota.trim() },
        {
          id_usuario: usuario.id_usuario,
          rol: usuario.rol,
          id_sucursal: usuario.id_sucursal,
        }
      );

      res.json({ mensaje: 'Registro descartado correctamente' });
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
