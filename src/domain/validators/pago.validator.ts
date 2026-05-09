import { MetodoPago, EstadoPago, CrearPagoDto } from '../interfaces/pago.interface';

export function validateCrearPago(body: any): { data?: CrearPagoDto; error?: string } {
  const { id_orden, monto, metodo, referencia, propina } = body ?? {};

  if (!id_orden || typeof id_orden !== 'number') {
    return { error: 'El ID de orden es requerido y debe ser un número.' };
  }

  if (monto === undefined || typeof monto !== 'number' || monto <= 0) {
    return { error: 'El monto es requerido y debe ser un número positivo.' };
  }

  if (!metodo || !['efectivo', 'tarjeta', 'transferencia', 'billetera'].includes(metodo)) {
    return { error: 'El método de pago es requerido y debe ser uno de: efectivo, tarjeta, transferencia, billetera.' };
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
      metodo,
      referencia: referencia?.trim(),
      propina,
    },
  };
}