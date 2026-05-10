import { CrearTipoOrdenDto, ActualizarTipoOrdenDto } from '../interfaces/tipo-orden.interface';

export function validateCrearTipoOrden(body: any): { data?: CrearTipoOrdenDto; error?: string } {
  const { nombre, id_tipo_orden_padre, requiere_mesa } = body ?? {};

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
    return { error: 'El nombre del tipo de orden es requerido y debe ser una cadena no vacía.' };
  }

  if (
    id_tipo_orden_padre !== undefined &&
    id_tipo_orden_padre !== null &&
    (typeof id_tipo_orden_padre !== 'number' || !Number.isInteger(id_tipo_orden_padre) || id_tipo_orden_padre <= 0)
  ) {
    return { error: 'El tipo de orden padre debe ser un identificador entero positivo.' };
  }

  if (requiere_mesa !== undefined && typeof requiere_mesa !== 'boolean') {
    return { error: 'El campo requiere_mesa debe ser un booleano.' };
  }

  return {
    data: {
      nombre: nombre.trim(),
      id_tipo_orden_padre: id_tipo_orden_padre ?? null,
      requiere_mesa: requiere_mesa ?? false,
    },
  };
}

export function validateActualizarTipoOrden(body: any): { data?: ActualizarTipoOrdenDto; error?: string } {
  const { nombre, id_tipo_orden_padre, requiere_mesa } = body ?? {};

  if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim().length === 0)) {
    return { error: 'El nombre debe ser una cadena no vacía.' };
  }

  if (
    id_tipo_orden_padre !== undefined &&
    id_tipo_orden_padre !== null &&
    (typeof id_tipo_orden_padre !== 'number' || !Number.isInteger(id_tipo_orden_padre) || id_tipo_orden_padre <= 0)
  ) {
    return { error: 'El tipo de orden padre debe ser un identificador entero positivo.' };
  }

  if (requiere_mesa !== undefined && typeof requiere_mesa !== 'boolean') {
    return { error: 'El campo requiere_mesa debe ser un booleano.' };
  }

  return {
    data: {
      ...(nombre !== undefined && { nombre: nombre.trim() }),
      ...(id_tipo_orden_padre !== undefined && { id_tipo_orden_padre }),
      ...(requiere_mesa !== undefined && { requiere_mesa }),
    },
  };
}
