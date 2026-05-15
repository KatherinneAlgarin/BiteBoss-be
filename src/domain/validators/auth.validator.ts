import type { LoginDto, OlvidarContrasenaDto } from '../interfaces/auth.interface';



export function validateOlvidarContrasena(body: any): { data?: OlvidarContrasenaDto; error?: string } {
  const { email } = body ?? {};

  if (!email || typeof email !== 'string') {
    return { error: 'El email es requerido' };
  }

  const emailNorm = email.trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailNorm)) {
    return { error: 'El email no tiene un formato válido' };
  }

  return { data: { email: emailNorm } };
}
