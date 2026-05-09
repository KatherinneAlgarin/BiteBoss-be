import type { LoginDto, OlvidarContrasenaDto } from '../interfaces/auth.interface';



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
