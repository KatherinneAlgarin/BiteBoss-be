import type { CrearBodegaDto, ActualizarBodegaDto, TipoBodega } from '../interfaces/bodega.interface';

const TIPOS_VALIDOS: TipoBodega[] = ['COCINA', 'ALMACEN', 'CONGELADOR', 'OTRO'];

export function validateCrearBodega(body: any): { data?: CrearBodegaDto; error?: string } {
  const { nombre, tipo, id_sucursal, descripcion } = body ?? {};

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
    return { error: 'El nombre de la bodega es requerido.' };
  }

  if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
    return { error: `El tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}.` };
  }

  if (!id_sucursal || typeof id_sucursal !== 'number' || !Number.isInteger(id_sucursal) || id_sucursal <= 0) {
    return { error: 'El id_sucursal debe ser un número entero positivo.' };
  }

  if (descripcion !== undefined && descripcion !== null && typeof descripcion !== 'string') {
    return { error: 'La descripción debe ser una cadena.' };
  }

  return {
    data: {
      nombre: nombre.trim(),
      tipo: tipo as TipoBodega,
      id_sucursal,
      descripcion: descripcion?.trim() ?? null,
    },
  };
}

export function validateActualizarBodega(body: any): { data?: ActualizarBodegaDto; error?: string } {
  const { nombre, tipo, id_sucursal, descripcion } = body ?? {};

  if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim().length === 0)) {
    return { error: 'El nombre debe ser una cadena no vacía.' };
  }

  if (tipo !== undefined && !TIPOS_VALIDOS.includes(tipo)) {
    return { error: `El tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}.` };
  }

  if (id_sucursal !== undefined && (typeof id_sucursal !== 'number' || !Number.isInteger(id_sucursal) || id_sucursal <= 0)) {
    return { error: 'El id_sucursal debe ser un número entero positivo.' };
  }

  if (descripcion !== undefined && descripcion !== null && typeof descripcion !== 'string') {
    return { error: 'La descripción debe ser una cadena.' };
  }

  return {
    data: {
      ...(nombre !== undefined && { nombre: nombre.trim() }),
      ...(tipo !== undefined && { tipo: tipo as TipoBodega }),
      ...(id_sucursal !== undefined && { id_sucursal }),
      ...(descripcion !== undefined && { descripcion: descripcion?.trim() ?? null }),
    },
  };
}
