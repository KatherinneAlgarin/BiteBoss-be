import { CrearSucursalDto, ActualizarSucursalDto } from '../interfaces/sucursal.interface';

function validarArregloIds(valor: any, etiqueta: string): string | null {
  if (!Array.isArray(valor)) {
    return `${etiqueta} debe ser un arreglo de identificadores.`;
  }
  for (const id of valor) {
    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
      return `${etiqueta} contiene identificadores inválidos.`;
    }
  }
  return null;
}

export function validateCrearSucursal(body: any): { data?: CrearSucursalDto; error?: string } {
  const { nombre, direccion, tipos_orden, tipos_pago } = body ?? {};

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
    return { error: 'El nombre de la sucursal es requerido.' };
  }

  if (direccion !== undefined && direccion !== null && typeof direccion !== 'string') {
    return { error: 'La dirección debe ser una cadena.' };
  }

  const errorTiposOrden = validarArregloIds(tipos_orden, 'Tipos de orden');
  if (errorTiposOrden) return { error: errorTiposOrden };
  if ((tipos_orden as number[]).length < 1) {
    return { error: 'Debe seleccionar al menos un tipo de orden.' };
  }

  const errorTiposPago = validarArregloIds(tipos_pago, 'Métodos de pago');
  if (errorTiposPago) return { error: errorTiposPago };
  if ((tipos_pago as number[]).length < 1) {
    return { error: 'Debe seleccionar al menos un método de pago.' };
  }

  return {
    data: {
      nombre: nombre.trim(),
      direccion: direccion?.trim() ?? null,
      tipos_orden,
      tipos_pago,
    },
  };
}

export function validateActualizarSucursal(body: any): { data?: ActualizarSucursalDto; error?: string } {
  const { nombre, direccion, tipos_orden, tipos_pago } = body ?? {};

  if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim().length === 0)) {
    return { error: 'El nombre debe ser una cadena no vacía.' };
  }

  if (direccion !== undefined && direccion !== null && typeof direccion !== 'string') {
    return { error: 'La dirección debe ser una cadena.' };
  }

  if (tipos_orden !== undefined) {
    const errorTiposOrden = validarArregloIds(tipos_orden, 'Tipos de orden');
    if (errorTiposOrden) return { error: errorTiposOrden };
    if ((tipos_orden as number[]).length < 1) {
      return { error: 'Debe seleccionar al menos un tipo de orden.' };
    }
  }

  if (tipos_pago !== undefined) {
    const errorTiposPago = validarArregloIds(tipos_pago, 'Métodos de pago');
    if (errorTiposPago) return { error: errorTiposPago };
    if ((tipos_pago as number[]).length < 1) {
      return { error: 'Debe seleccionar al menos un método de pago.' };
    }
  }

  return {
    data: {
      ...(nombre !== undefined && { nombre: nombre.trim() }),
      ...(direccion !== undefined && { direccion: direccion?.trim() ?? null }),
      ...(tipos_orden !== undefined && { tipos_orden }),
      ...(tipos_pago !== undefined && { tipos_pago }),
    },
  };
}
