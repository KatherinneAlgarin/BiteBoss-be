import type { CrearIngredienteDto, ActualizarIngredienteDto } from '../interfaces/ingrediente.interface';

export function validateCrearIngrediente(body: any): { data?: CrearIngredienteDto; error?: string } {
  const { nombre, unidad_medida, stock_inicial } = body ?? {};

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
    return { error: 'El nombre del ingrediente es requerido.' };
  }

  if (!unidad_medida || typeof unidad_medida !== 'string' || unidad_medida.trim().length === 0) {
    return { error: 'La unidad de medida es requerida.' };
  }

  if (stock_inicial !== undefined) {
    const { id_bodega, cantidad, stock_minimo, stock_maximo } = stock_inicial ?? {};

    if (!id_bodega || typeof id_bodega !== 'number' || !Number.isInteger(id_bodega) || id_bodega <= 0) {
      return { error: 'El id_bodega del stock inicial debe ser un número entero positivo.' };
    }

    if (typeof cantidad !== 'number' || cantidad <= 0) {
      return { error: 'La cantidad inicial debe ser mayor a 0.' };
    }

    if (typeof stock_minimo !== 'number' || stock_minimo < 0) {
      return { error: 'El stock mínimo debe ser mayor o igual a 0.' };
    }

    if (typeof stock_maximo !== 'number' || stock_maximo < stock_minimo) {
      return { error: 'El stock máximo debe ser mayor o igual al stock mínimo.' };
    }
  }

  return {
    data: {
      nombre: nombre.trim(),
      unidad_medida: unidad_medida.trim(),
      ...(stock_inicial !== undefined && { stock_inicial }),
    },
  };
}

export function validateActualizarIngrediente(body: any): { data?: ActualizarIngredienteDto; error?: string } {
  const { nombre, unidad_medida } = body ?? {};

  if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim().length === 0)) {
    return { error: 'El nombre debe ser una cadena no vacía.' };
  }

  if (unidad_medida !== undefined && (typeof unidad_medida !== 'string' || unidad_medida.trim().length === 0)) {
    return { error: 'La unidad de medida debe ser una cadena no vacía.' };
  }

  return {
    data: {
      ...(nombre !== undefined && { nombre: nombre.trim() }),
      ...(unidad_medida !== undefined && { unidad_medida: unidad_medida.trim() }),
    },
  };
}
