import { Request, Response } from 'express';
import { KpiService } from '../../services/kpi.service';
import { AppError } from '../../helpers/app-error';

export class KpiController {
  constructor(private readonly service = new KpiService()) {}

  async ventas(req: Request, res: Response): Promise<void> {
    const { fecha_inicio, fecha_fin, id_sucursal: id_sucursal_query } = req.query as Record<string, string>;

    if (!fecha_inicio || !fecha_fin) {
      res.status(400).json({ mensaje: 'Se requieren fecha_inicio y fecha_fin (YYYY-MM-DD).' });
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha_fin)) {
      res.status(400).json({ mensaje: 'Las fechas deben tener formato YYYY-MM-DD.' });
      return;
    }

    if (fecha_inicio > fecha_fin) {
      res.status(400).json({ mensaje: 'fecha_inicio no puede ser posterior a fecha_fin.' });
      return;
    }

    // El gerente siempre usa su propia sucursal; el admin puede pasar id_sucursal opcional
    const rol = req.usuario?.rol?.toLowerCase();
    let id_sucursal: number | undefined;

    if (rol === 'gerente') {
      id_sucursal = req.usuario?.id_sucursal;
    } else if (id_sucursal_query) {
      const parsed = parseInt(id_sucursal_query, 10);
      if (isNaN(parsed) || parsed <= 0) {
        res.status(400).json({ mensaje: 'id_sucursal inválido.' });
        return;
      }
      id_sucursal = parsed;
    }

    try {
      const data = await this.service.obtenerVentas({ fecha_inicio, fecha_fin, id_sucursal });
      res.json(data);
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async comparativa(req: Request, res: Response): Promise<void> {
    const { fecha_inicio, fecha_fin } = req.query as Record<string, string>;

    if (!fecha_inicio || !fecha_fin) {
      res.status(400).json({ mensaje: 'Se requieren fecha_inicio y fecha_fin (YYYY-MM-DD).' });
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha_fin)) {
      res.status(400).json({ mensaje: 'Las fechas deben tener formato YYYY-MM-DD.' });
      return;
    }

    if (fecha_inicio > fecha_fin) {
      res.status(400).json({ mensaje: 'fecha_inicio no puede ser posterior a fecha_fin.' });
      return;
    }

    try {
      const data = await this.service.obtenerComparativa({ fecha_inicio, fecha_fin });
      res.json(data);
    } catch (err) {
      if (err instanceof AppError) { res.status(err.statusCode).json({ mensaje: err.message }); return; }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
}
