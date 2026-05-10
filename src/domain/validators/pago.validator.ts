import supabase from '../../config/supabase';
import { CrearPagoDto } from '../interfaces/pago.interface';

export async function validateCrearPago(body: any): Promise<{ data?: CrearPagoDto; error?: string }> {
  const { id_orden, monto, metodo, referencia, propina } = body ?? {};

  if (!id_orden || typeof id_orden !== 'number') {
    return { error: 'El ID de orden es requerido y debe ser un número.' };
  }

  if (monto === undefined || typeof monto !== 'number' || monto <= 0) {
    return { error: 'El monto es requerido y debe ser un número positivo.' };
  }

  if (!metodo || typeof metodo !== 'string' || metodo.trim().length === 0) {
    return { error: 'El método de pago es requerido y debe ser una cadena no vacía.' };
  }

  const { data: tipoPago, error: tipoError } = await supabase
    .from('tipo_pago')
    .select('id_tipo_pago')
    .ilike('nombre', metodo.trim())
    .maybeSingle();

  if (tipoError) {
    return { error: 'Error al validar el tipo de pago.' };
  }

  if (!tipoPago) {
    return { error: `El tipo de pago "${metodo}" no está registrado.` };
  }

  if (referencia && typeof referencia !== 'string') {
    return { error: 'La referencia debe ser una cadena.' };
  }

  if (propina !== undefined && (typeof propina !== 'number' || propina < 0)) {
    return { error: 'La propina debe ser un número no negativo.' };
  }

  return {
    data: {
      id_orden,
      monto,
      metodo: metodo.trim(),
      referencia: referencia?.trim(),
      propina,
    },
  };
}
