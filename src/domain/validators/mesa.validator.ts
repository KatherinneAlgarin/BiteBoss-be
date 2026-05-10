import { CrearMesaDto, ActualizarMesaDto } from '../interfaces/mesa.interface';

export function validateCrearMesa(body: any): { data?: CrearMesaDto; error?: string } {
  const { id_zona, numero, capacidad } = body ?? {};

  if (typeof id_zona !== 'number' || !Number.isInteger(id_zona) || id_zona <= 0) {
    return { error: 'La zona es requerida y debe ser un identificador entero positivo.' };
  }

  if (typeof numero !== 'number' || !Number.isInteger(numero) || numero <= 0) {
    return { error: 'El número de mesa es requerido y debe ser un entero positivo.' };
  }

  if (typeof capacidad !== 'number' || !Number.isInteger(capacidad) || capacidad < 1) {
    return { error: 'La capacidad es requerida y debe ser un entero mayor o igual a 1.' };
  }

  return {
    data: { id_zona, numero, capacidad },
  };
}

export function validateActualizarMesa(body: any): { data?: ActualizarMesaDto; error?: string } {
  const { id_zona, numero, capacidad } = body ?? {};

  if (id_zona !== undefined && (typeof id_zona !== 'number' || !Number.isInteger(id_zona) || id_zona <= 0)) {
    return { error: 'La zona debe ser un identificador entero positivo.' };
  }

  if (numero !== undefined && (typeof numero !== 'number' || !Number.isInteger(numero) || numero <= 0)) {
    return { error: 'El número de mesa debe ser un entero positivo.' };
  }

  if (capacidad !== undefined && (typeof capacidad !== 'number' || !Number.isInteger(capacidad) || capacidad < 1)) {
    return { error: 'La capacidad debe ser un entero mayor o igual a 1.' };
  }

  return {
    data: {
      ...(id_zona !== undefined && { id_zona }),
      ...(numero !== undefined && { numero }),
      ...(capacidad !== undefined && { capacidad }),
    },
  };
}
