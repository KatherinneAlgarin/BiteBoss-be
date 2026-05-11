import { CrearZonaDto, ActualizarZonaDto } from '../interfaces/zona.interface';

export function validateCrearZona(body: any): { data?: CrearZonaDto; error?: string } {
  const { id_sucursal, nombre, descripcion } = body ?? {};

  if (typeof id_sucursal !== 'number' || !Number.isInteger(id_sucursal) || id_sucursal <= 0) {
    return { error: 'La sucursal es requerida y debe ser un identificador entero positivo.' };
  }

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
    return { error: 'El nombre de la zona es requerido.' };
  }

  if (descripcion !== undefined && descripcion !== null && typeof descripcion !== 'string') {
    return { error: 'La descripción debe ser una cadena.' };
  }

  return {
    data: {
      id_sucursal,
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() ?? null,
    },
  };
}

export function validateActualizarZona(body: any): { data?: ActualizarZonaDto; error?: string } {
  const { nombre, descripcion } = body ?? {};

  if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim().length === 0)) {
    return { error: 'El nombre debe ser una cadena no vacía.' };
  }

  if (descripcion !== undefined && descripcion !== null && typeof descripcion !== 'string') {
    return { error: 'La descripción debe ser una cadena.' };
  }

  return {
    data: {
      ...(nombre !== undefined && { nombre: nombre.trim() }),
      ...(descripcion !== undefined && { descripcion: descripcion?.trim() ?? null }),
    },
  };
}
