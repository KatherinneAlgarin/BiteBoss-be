import { CrearReservacionDto, ActualizarReservacionDto } from '../interfaces/reservacion.interface';

const TIEMPOS_EXTRA_VALIDOS = [0, 30, 60, 90];

export function validateActualizarReservacion(body: any): { data?: ActualizarReservacionDto; error?: string } {
  const { nombre_cliente, telefono, email, fecha_llegada, cantidad_personas, id_zona, id_mesa, tiempo_extra_minutos } = body ?? {};

  if (nombre_cliente !== undefined && (typeof nombre_cliente !== 'string' || nombre_cliente.trim().length === 0)) {
    return { error: 'El nombre del cliente no puede estar vacío.' };
  }

  if (telefono !== undefined && telefono !== null && typeof telefono !== 'string') {
    return { error: 'El teléfono debe ser una cadena de texto.' };
  }

  if (email !== undefined && email !== null && typeof email !== 'string') {
    return { error: 'El email debe ser una cadena de texto.' };
  }

  if (fecha_llegada !== undefined) {
    if (typeof fecha_llegada !== 'string' || fecha_llegada.trim().length === 0) {
      return { error: 'La fecha y hora de llegada no puede estar vacía.' };
    }
    if (isNaN(new Date(fecha_llegada).getTime())) {
      return { error: 'La fecha y hora de llegada no tiene un formato válido.' };
    }
  }

  if (cantidad_personas !== undefined && (typeof cantidad_personas !== 'number' || !Number.isInteger(cantidad_personas) || cantidad_personas <= 0)) {
    return { error: 'La cantidad de personas debe ser un entero positivo.' };
  }

  if (id_zona !== undefined && (typeof id_zona !== 'number' || !Number.isInteger(id_zona) || id_zona <= 0)) {
    return { error: 'La zona debe ser un identificador entero positivo.' };
  }

  if (id_mesa !== undefined && (typeof id_mesa !== 'number' || !Number.isInteger(id_mesa) || id_mesa <= 0)) {
    return { error: 'La mesa debe ser un identificador entero positivo.' };
  }

  if (tiempo_extra_minutos !== undefined && !TIEMPOS_EXTRA_VALIDOS.includes(tiempo_extra_minutos)) {
    return { error: 'El tiempo extra debe ser 0, 30, 60 o 90 minutos.' };
  }

  const data: ActualizarReservacionDto = {};
  if (nombre_cliente !== undefined)       data.nombre_cliente       = nombre_cliente.trim();
  if (telefono !== undefined)             data.telefono             = telefono?.trim() ?? null;
  if (email !== undefined)                data.email                = email?.trim() ?? null;
  if (fecha_llegada !== undefined)        data.fecha_llegada        = fecha_llegada.trim();
  if (cantidad_personas !== undefined)    data.cantidad_personas    = cantidad_personas;
  if (id_zona !== undefined)             data.id_zona              = id_zona;
  if (id_mesa !== undefined)             data.id_mesa              = id_mesa;
  if (tiempo_extra_minutos !== undefined) data.tiempo_extra_minutos = tiempo_extra_minutos;

  return { data };
}

export function validateCrearReservacion(body: any): { data?: CrearReservacionDto; error?: string } {
  const { nombre_cliente, telefono, email, fecha_llegada, cantidad_personas, id_zona, id_mesa, tiempo_extra_minutos } = body ?? {};

  if (!nombre_cliente || typeof nombre_cliente !== 'string' || nombre_cliente.trim().length === 0) {
    return { error: 'El nombre del cliente es requerido.' };
  }

  if (telefono !== undefined && telefono !== null && typeof telefono !== 'string') {
    return { error: 'El teléfono debe ser una cadena de texto.' };
  }

  if (email !== undefined && email !== null && typeof email !== 'string') {
    return { error: 'El email debe ser una cadena de texto.' };
  }

  if (!fecha_llegada || typeof fecha_llegada !== 'string' || fecha_llegada.trim().length === 0) {
    return { error: 'La fecha y hora de llegada es requerida.' };
  }

  if (isNaN(new Date(fecha_llegada).getTime())) {
    return { error: 'La fecha y hora de llegada no tiene un formato válido.' };
  }

  if (typeof cantidad_personas !== 'number' || !Number.isInteger(cantidad_personas) || cantidad_personas <= 0) {
    return { error: 'La cantidad de personas es requerida y debe ser un entero positivo.' };
  }

  if (typeof id_zona !== 'number' || !Number.isInteger(id_zona) || id_zona <= 0) {
    return { error: 'La zona es requerida y debe ser un identificador entero positivo.' };
  }

  if (typeof id_mesa !== 'number' || !Number.isInteger(id_mesa) || id_mesa <= 0) {
    return { error: 'La mesa es requerida y debe ser un identificador entero positivo.' };
  }

  if (tiempo_extra_minutos !== undefined && !TIEMPOS_EXTRA_VALIDOS.includes(tiempo_extra_minutos)) {
    return { error: 'El tiempo extra debe ser 0, 30, 60 o 90 minutos.' };
  }

  return {
    data: {
      nombre_cliente:       nombre_cliente.trim(),
      telefono:             telefono?.trim() ?? null,
      email:                email?.trim() ?? null,
      fecha_llegada:        fecha_llegada.trim(),
      cantidad_personas,
      id_zona,
      id_mesa,
      tiempo_extra_minutos: tiempo_extra_minutos ?? 0,
    },
  };
}
