import { ProductoDto, CategoriaDto } from '../interfaces/producto.interface';

export function validateCrearProducto(body: any): { data?: ProductoDto; error?: string } {
  const { nombre, descripcion, precio, id_categoria, id_sucursal, ids_sucursales, activo = true, imagen } = body ?? {};

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
    return { error: 'El nombre del producto es requerido y debe ser una cadena no vacía.' };
  }

  if (precio === undefined || typeof precio !== 'number' || precio < 0) {
    return { error: 'El precio es requerido y debe ser un número positivo.' };
  }

  if (!id_categoria || typeof id_categoria !== 'number') {
    return { error: 'El ID de categoría es requerido y debe ser un número.' };
  }

  const sucursalesNormalizadas = Array.isArray(ids_sucursales)
    ? Array.from(new Set(ids_sucursales.filter((id: any) => typeof id === 'number')))
    : typeof id_sucursal === 'number'
      ? [id_sucursal]
      : [];

  if (sucursalesNormalizadas.length === 0) {
    return { error: 'Debe enviar al menos una sucursal válida para el producto.' };
  }

  if (typeof activo !== 'boolean') {
    return { error: 'El campo activo debe ser un booleano.' };
  }

  if (imagen && typeof imagen !== 'string') {
    return { error: 'La imagen debe ser una cadena.' };
  }

  return {
    data: {
      nombre: nombre.trim(),
      descripcion: descripcion?.trim(),
      precio,
      id_categoria,
      id_sucursal: sucursalesNormalizadas[0],
      ids_sucursales: sucursalesNormalizadas,
      activo,
      imagen,
    },
  };
}

export function validateActualizarProducto(body: any): { data?: Partial<ProductoDto>; error?: string } {
  const { nombre, descripcion, precio, id_categoria, activo, imagen, ids_sucursales } = body ?? {};

  if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim().length === 0)) {
    return { error: 'El nombre debe ser una cadena no vacía.' };
  }

  if (precio !== undefined && (typeof precio !== 'number' || precio < 0)) {
    return { error: 'El precio debe ser un número positivo.' };
  }

  if (id_categoria !== undefined && typeof id_categoria !== 'number') {
    return { error: 'El ID de categoría debe ser un número.' };
  }

  if (activo !== undefined && typeof activo !== 'boolean') {
    return { error: 'El campo activo debe ser un booleano.' };
  }

  if (imagen !== undefined && typeof imagen !== 'string') {
    return { error: 'La imagen debe ser una cadena.' };
  }

  if (ids_sucursales !== undefined) {
    if (!Array.isArray(ids_sucursales)) {
      return { error: 'ids_sucursales debe ser un arreglo de números.' };
    }

    const normalizadas = Array.from(new Set(ids_sucursales.filter((id: any) => typeof id === 'number')));
    if (normalizadas.length === 0) {
      return { error: 'Debe enviar al menos una sucursal válida para actualizar.' };
    }
  }

  return {
    data: {
      ...(nombre !== undefined && { nombre: nombre.trim() }),
      ...(descripcion !== undefined && { descripcion: descripcion.trim() }),
      ...(precio !== undefined && { precio }),
      ...(id_categoria !== undefined && { id_categoria }),
      ...(activo !== undefined && { activo }),
      ...(imagen !== undefined && { imagen }),
      ...(ids_sucursales !== undefined && { ids_sucursales: Array.from(new Set(ids_sucursales.filter((id: any) => typeof id === 'number'))) }),
    },
  };
}

export function validateCrearCategoria(body: any): { data?: CategoriaDto; error?: string } {
  const { nombre, descripcion, id_sucursal, activo = true } = body ?? {};

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
    return { error: 'El nombre de la categoría es requerido y debe ser una cadena no vacía.' };
  }

  if (!id_sucursal || typeof id_sucursal !== 'number') {
    return { error: 'El ID de sucursal es requerido y debe ser un número.' };
  }

  if (typeof activo !== 'boolean') {
    return { error: 'El campo activo debe ser un booleano.' };
  }

  return {
    data: {
      nombre: nombre.trim(),
      descripcion: descripcion?.trim(),
      id_sucursal,
      activo,
    },
  };
}