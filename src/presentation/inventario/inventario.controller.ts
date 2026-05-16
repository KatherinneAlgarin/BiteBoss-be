import { Request, Response } from 'express';
import { AppError } from '../../helpers/app-error';
import { InventarioService } from '../../services/inventario.service';

export class InventarioController {
  constructor(private readonly inventarioService = new InventarioService()) {}

  async listarStockActual(req: Request, res: Response): Promise<void> {
    try {
      const id_sucursal = req.usuario?.id_sucursal;
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
