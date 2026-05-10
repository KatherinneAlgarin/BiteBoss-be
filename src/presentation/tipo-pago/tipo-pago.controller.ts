import { Request, Response } from 'express';
import { TipoPagoService } from '../../services/tipo-pago.service';
import { AppError } from '../../helpers/app-error';

export class TipoPagoController {
  constructor(private readonly tipoPagoService = new TipoPagoService()) {}

  async listar(_req: Request, res: Response): Promise<void> {
    try {
      const tipos = await this.tipoPagoService.listar();
      res.json(tipos);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
}
