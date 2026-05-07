import type { LoginDto, OlvidarContrasenaDto } from '../interfaces/auth.interface';

export function validateLogin(body: any): { data?: LoginDto; error?: string } {
  const { email, password } = body ?? {};

  if (!email || typeof email !== 'string') {
    return { error: 'El email es requerido' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: 'El email no tiene un formato válido' };
  }

  if (!password || typeof password !== 'string') {
    return { error: 'La contraseña es requerida' };
  }

  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres' };
  }

  return { data: { email: email.trim().toLowerCase(), password } };
}

export function validateOlvidarContrasena(body: any): { data?: OlvidarContrasenaDto; error?: string } {
  const { email } = body ?? {};

  if (!email || typeof email !== 'string') {
    return { error: 'El email es requerido' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: 'El email no tiene un formato válido' };
  }

  return { data: { email: email.trim().toLowerCase() } };
}
