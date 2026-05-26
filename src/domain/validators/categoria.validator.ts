import type { CrearCategoriaDto, ActualizarCategoriaDto } from '../interfaces/categoria.interface';

export function validateCrearCategoria(body: any): { data?: CrearCategoriaDto; error?: string } {
  const { nombre } = body ?? {};

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
    return { error: 'El nombre de la categoría es requerido y debe ser una cadena no vacía.' };
  }

  return { data: { nombre: nombre.trim() } };
}

export function validateActualizarCategoria(body: any): { data?: ActualizarCategoriaDto; error?: string } {
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
