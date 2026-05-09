import type { ActualizarPerfilDto, CrearUsuarioDto } from '../interfaces/usuario.interface';

export function validateCrearUsuario(body: any): { data?: CrearUsuarioDto; error?: string } {
  const { nombre, email, password, id_rol, id_sucursal } = body ?? {};

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
    return { error: 'El nombre es requerido y debe tener al menos 2 caracteres' };
  }

  if (!email || typeof email !== 'string') {
    return { error: 'El email es requerido' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: 'El email no tiene un formato válido' };
  }

  if (!password || typeof password !== 'string') {
    return { error: 'La contraseña temporal es requerida' };
  }

  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres' };
  }

  if (!id_rol || typeof id_rol !== 'number' || !Number.isInteger(id_rol) || id_rol <= 0) {
    return { error: 'El rol es requerido' };
  }

  if (!id_sucursal || typeof id_sucursal !== 'number' || !Number.isInteger(id_sucursal) || id_sucursal <= 0) {
    return { error: 'La sucursal es requerida' };
  }

  return {
    data: {
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      password,
      id_rol,
      id_sucursal,
    },
  };
}

const contrasenaRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export function validateActualizarPerfil(body: any): { data?: ActualizarPerfilDto; error?: string } {
  const { nombre, nuevaContrasena } = body ?? {};

  const tieneNombre = nombre !== undefined;
  const tieneContrasena = nuevaContrasena !== undefined;

  if (!tieneNombre && !tieneContrasena) {
    return { error: 'Debe proporcionar al menos un campo para actualizar' };
  }

  if (tieneNombre) {
    if (typeof nombre !== 'string' || nombre.trim().length < 2) {
      return { error: 'El nombre debe tener al menos 2 caracteres' };
    }
  }

  if (tieneContrasena) {
    if (typeof nuevaContrasena !== 'string' || !contrasenaRegex.test(nuevaContrasena)) {
      return { error: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número' };
    }
  }

  return {
    data: {
      nombre: tieneNombre ? nombre.trim() : undefined,
      nuevaContrasena: tieneContrasena ? nuevaContrasena : undefined,
    },
  };
}
