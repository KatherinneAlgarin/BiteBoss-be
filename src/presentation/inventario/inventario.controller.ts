import { Request, Response } from 'express';
import { AppError } from '../../helpers/app-error';
import { InventarioService } from '../../services/inventario.service';

export class InventarioController {
  constructor(private readonly inventarioService = new InventarioService()) {}

  async listarStockActual(req: Request, res: Response): Promise<void> {
    try {
      const querySucursal = req.query.id_sucursal;
      const idSucursalQuery =
        typeof querySucursal === 'string' && querySucursal.trim().length > 0
          ? Number(querySucursal)
          : undefined;

      if (idSucursalQuery !== undefined && Number.isNaN(idSucursalQuery)) {
        res.status(400).json({ mensaje: 'El id_sucursal debe ser un numero valido' });
        return;
      }

      const id_sucursal = idSucursalQuery ?? req.usuario?.id_sucursal;
      const inventario = await this.inventarioService.listarStockActualProductos(id_sucursal);
      res.json(inventario);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }

      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
}
