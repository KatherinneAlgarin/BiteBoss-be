import { ProveedorDto } from '../interfaces/proveedor.interface';

export function validateCrearProveedor(body: any): { data?: ProveedorDto; error?: string } {
  const { nombre, email, telefono, direccion, activo = true } = body ?? {};

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
    return { error: 'El nombre del proveedor es requerido y debe ser una cadena no vacía.' };
  }

  // Validar que al menos tenga email o teléfono
  const tieneEmail = email && typeof email === 'string' && email.trim().length > 0;
  const tieneTelefono = telefono && typeof telefono === 'string' && telefono.trim().length > 0;

  if (!tieneEmail && !tieneTelefono) {
    return { error: 'El proveedor debe tener al menos un dato de contacto (email o teléfono).' };
  }

  // Validar formato de email si se proporciona
  if (tieneEmail && !isValidEmail(email.trim())) {
    return { error: 'El formato del email no es válido.' };
  }

  if (typeof activo !== 'boolean') {
    return { error: 'El campo activo debe ser un booleano.' };
  }

  return {
    data: {
      nombre: nombre.trim(),
      email: tieneEmail ? email.trim() : undefined,
      telefono: tieneTelefono ? telefono.trim() : undefined,
      direccion: direccion?.trim(),
      activo,
    },
  };
}

export function validateActualizarProveedor(body: any): { data?: Partial<ProveedorDto>; error?: string } {
  const { nombre, email, telefono, direccion, activo } = body ?? {};

  if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim().length === 0)) {
    return { error: 'El nombre debe ser una cadena no vacía.' };
  }

  // Si se actualiza email o teléfono, validar que al menos uno esté presente
  if ((email !== undefined || telefono !== undefined) && nombre === undefined) {
    // Obtener valores actuales (se validará después en el servicio)
    const tieneEmail = email && typeof email === 'string' && email.trim().length > 0;
    const tieneTelefono = telefono && typeof telefono === 'string' && telefono.trim().length > 0;

    if (!tieneEmail && !tieneTelefono) {
      return { error: 'El proveedor debe tener al menos un dato de contacto (email o teléfono).' };
    }
  }

  // Validar formato de email si se proporciona
  if (email !== undefined && email !== null) {
    if (email === '') {
      return { error: 'El email debe tener contenido o no incluirse en la actualización.' };
    }
    if (typeof email !== 'string' || !isValidEmail(email.trim())) {
      return { error: 'El formato del email no es válido.' };
    }
  }

  if (telefono !== undefined && telefono !== null && typeof telefono !== 'string') {
    return { error: 'El teléfono debe ser una cadena.' };
  }

  if (activo !== undefined && typeof activo !== 'boolean') {
    return { error: 'El campo activo debe ser un booleano.' };
  }

  return {
    data: {
      ...(nombre !== undefined && { nombre: nombre.trim() }),
      ...(email !== undefined && email !== null && { email: email.trim() }),
      ...(email === '' && { email: undefined }),
      ...(telefono !== undefined && { telefono: telefono?.trim() }),
      ...(direccion !== undefined && { direccion: direccion?.trim() }),
      ...(activo !== undefined && { activo }),
    },
  };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
