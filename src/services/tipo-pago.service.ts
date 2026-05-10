import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import type { TipoPagoItem } from '../domain/interfaces/tipo-pago.interface';

export class TipoPagoService {

  async listar(): Promise<TipoPagoItem[]> {
    const { data, error } = await supabase
      .from('tipo_pago')
      .select('id_tipo_pago, nombre')
      .order('nombre', { ascending: true });

    if (error) {
      throw new AppError('Error al listar tipos de pago', 500);
    }

    return data ?? [];
  }
}
