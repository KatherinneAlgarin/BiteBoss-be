import { EstadoOperativo, EstadoFinanciero, CrearOrdenDetalleDto, ActualizarOrdenDto, ActualizarOrdenDetalleDto } from '../interfaces/orden.interface';

export function validateCrearOrdenDetalle(body: any): { data?: CrearOrdenDetalleDto; error?: string } {
  const { id_producto, cantidad, nota } = body ?? {};

  if (!id_producto || typeof id_producto !== 'number') {
    return { error: 'El ID del producto es requerido y debe ser un número.' };
  }

  if (cantidad === undefined || typeof cantidad !== 'number' || cantidad <= 0) {
    return { error: 'La cantidad es requerida y debe ser un número positivo.' };
  }

  if (nota && typeof nota !== 'string') {
    return { error: 'La nota debe ser una cadena.' };
  }

  return {
    data: {
      id_producto,
      cantidad,
      nota: nota?.trim(),
    },
  };
}

export function validateActualizarOrden(body: any): { data?: ActualizarOrdenDto; error?: string } {
  const { tipo_orden, id_mesa, estado_operativo, nombre_cliente, apellido_cliente } = body ?? {};

  if (tipo_orden !== undefined && (typeof tipo_orden !== 'string' || tipo_orden.trim().length === 0)) {
    return { error: 'El tipo de orden debe ser una cadena no vacía.' };
  }

  if (id_mesa !== undefined && typeof id_mesa !== 'number') {
    return { error: 'El ID de mesa debe ser un número.' };
  }

  if (estado_operativo && !['ABIERTO', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO'].includes(estado_operativo)) {
    return { error: 'El estado operativo debe ser uno de: ABIERTO, EN_PREPARACION, LISTO, ENTREGADO, CANCELADO.' };
  }

  if (nombre_cliente !== undefined && (typeof nombre_cliente !== 'string' || nombre_cliente.trim().length === 0)) {
    return { error: 'El nombre del cliente debe ser una cadena no vacía.' };
  }

  if (apellido_cliente !== undefined && (typeof apellido_cliente !== 'string' || apellido_cliente.trim().length === 0)) {
    return { error: 'El apellido del cliente debe ser una cadena no vacía.' };
  }

  return {
    data: {
      ...(tipo_orden && { tipo_orden }),
      ...(id_mesa !== undefined && { id_mesa }),
      ...(estado_operativo && { estado_operativo }),
      ...(nombre_cliente !== undefined && { nombre_cliente: nombre_cliente.trim() }),
      ...(apellido_cliente !== undefined && { apellido_cliente: apellido_cliente.trim() }),
    },
  };
}

export function validateActualizarOrdenDetalle(body: any): { data?: ActualizarOrdenDetalleDto; error?: string } {
  const { cantidad, nota, estado_linea } = body ?? {};

  if (cantidad !== undefined && (typeof cantidad !== 'number' || cantidad <= 0)) {
    return { error: 'La cantidad debe ser un número positivo.' };
  }

  if (nota !== undefined && typeof nota !== 'string') {
    return { error: 'La nota debe ser una cadena.' };
  }

  if (estado_linea && !['PENDIENTE', 'ENTREGADO', 'CANCELADO'].includes(estado_linea)) {
    return { error: 'El estado de línea debe ser uno de: PENDIENTE, ENTREGADO, CANCELADO.' };
  }

  return {
    data: {
      ...(cantidad !== undefined && { cantidad }),
      ...(nota !== undefined && { nota: nota.trim() }),
      ...(estado_linea && { estado_linea }),
    },
  };
}