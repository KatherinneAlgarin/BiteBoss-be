import { CrearTipoPagoDto, ActualizarTipoPagoDto } from '../interfaces/tipo-pago.interface';

export function validateCrearTipoPago(body: any): { data?: CrearTipoPagoDto; error?: string } {
  const { nombre, descripcion } = body ?? {};

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
    return { error: 'El nombre del método de pago es requerido y debe ser una cadena no vacía.' };
  }

  if (descripcion !== undefined && descripcion !== null && typeof descripcion !== 'string') {
    return { error: 'La descripción debe ser una cadena de texto.' };
  }

  return {
    data: {
      nombre: nombre.trim(),
      descripcion: descripcion === undefined ? null : (descripcion?.trim() || null),
    },
  };
}

export function validateActualizarTipoPago(body: any): { data?: ActualizarTipoPagoDto; error?: string } {
  const { nombre, descripcion } = body ?? {};

  if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim().length === 0)) {
    return { error: 'El nombre debe ser una cadena no vacía.' };
  }

  if (descripcion !== undefined && descripcion !== null && typeof descripcion !== 'string') {
    return { error: 'La descripción debe ser una cadena de texto.' };
  }

  return {
    data: {
      ...(nombre !== undefined && { nombre: nombre.trim() }),
      ...(descripcion !== undefined && { descripcion: descripcion?.trim() || null }),
    },
  };
}
