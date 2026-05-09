import jwt from 'jsonwebtoken';
import supabase, { supabaseAuth } from '../config/supabase';
import { envs } from '../config/envs';
import { AppError } from '../helpers/app-error';
import type { AuthPayload, AuthResponse, LoginDto, OlvidarContrasenaDto } from '../domain/interfaces/auth.interface';

export class AuthService {


  async olvidarContrasena({ email }: OlvidarContrasenaDto): Promise<void> {
    const redirectTo = `${envs.FRONTEND_URL}/reset-password`;
    const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, { redirectTo });

    // if (error) throw new AppError('Error al procesar la solicitud', 500);
    if (error) {
  console.error('Supabase error:', error);
  throw new AppError('Error al procesar la solicitud', 500);
}

  }
}
