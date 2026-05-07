import jwt from 'jsonwebtoken';
import supabase, { supabaseAuth } from '../config/supabase';
import { envs } from '../config/envs';
import { AppError } from '../helpers/app-error';
import type { AuthPayload, AuthResponse, LoginDto, OlvidarContrasenaDto } from '../domain/interfaces/auth.interface';

export class AuthService {

  async login({ email, password }: LoginDto): Promise<AuthResponse> {
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({ email, password });

    if (authError) throw new AppError('Credenciales inválidas', 401);

    const { data, error: dbError } = await supabase
      .from('usuario')
      .select(`
        id_usuario,
        nombre,
        email,
        activo,
        usuario_sucursal (
          id_usuario_sucursal,
          rol ( id_rol, nombre ),
          sucursal ( id_sucursal, nombre )
        )
      `)
      .eq('email', email)
      .eq('activo', true)
      .limit(1);

    if (dbError || !data?.[0]) throw new AppError('Usuario no encontrado en el sistema', 401);

    const usuario = data[0];
    const asignacion = usuario.usuario_sucursal?.[0];

    if (!asignacion) throw new AppError('El usuario no tiene sucursal ni rol asignado', 403);

    const payload: AuthPayload = {
      auth_id:             authData.user.id,
      id_usuario:          usuario.id_usuario,
      nombre:              usuario.nombre,
      email:               usuario.email,
      id_usuario_sucursal: asignacion.id_usuario_sucursal,
      id_rol:              (asignacion.rol as any)?.id_rol,
      rol:                 (asignacion.rol as any)?.nombre,
      id_sucursal:         (asignacion.sucursal as any)?.id_sucursal,
      sucursal:            (asignacion.sucursal as any)?.nombre,
    };

    const token = jwt.sign(payload, envs.JWT_SECRET, {
      expiresIn: envs.JWT_EXPIRES_IN as any,
    });

    return { token, usuario: payload };
  }

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
