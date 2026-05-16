import { CrearTipoPagoDto, ActualizarTipoPagoDto } from '../interfaces/tipo-pago.interface';

export function validateCrearTipoPago(body: any): { data?: CrearTipoPagoDto; error?: string } {
  const { nombre } = body ?? {};

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
    return { error: 'El nombre del método de pago es requerido y debe ser una cadena no vacía.' };
  }

  return {
    data: {
      nombre: nombre.trim(),
    },
  };
}

export function validateActualizarTipoPago(body: any): { data?: ActualizarTipoPagoDto; error?: string } {
  const { nombre } = body ?? {};

  if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim().length === 0)) {
    return { error: 'El nombre debe ser una cadena no vacía.' };
  }

  return {
    data: {
      ...(nombre !== undefined && { nombre: nombre.trim() }),
    },
  };
}
