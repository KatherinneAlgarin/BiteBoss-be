import { Request, Response, NextFunction } from 'express';
import supabase from '../config/supabase';
import type { AuthPayload } from '../domain/interfaces/auth.interface';

declare global {
  namespace Express {
    interface Request {
      usuario?: AuthPayload;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ mensaje: 'Token de acceso requerido' });
    return;
  }

  const token = authHeader.split(' ')[1];

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user?.email) {
    res.status(401).json({ mensaje: 'Token inválido o expirado' });
    return;
  }

  // Consulta la DB para obtener rol, sucursal y demás datos (fuente única de verdad)
  const { data: usuarios, error: dbError } = await supabase
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
    .eq('email', authData.user.email)
    .limit(1);

  if (dbError || !usuarios?.[0]) {
    res.status(401).json({ mensaje: 'Usuario no encontrado en el sistema' });
    return;
  }

  const usuario = usuarios[0];

  if (usuario.activo === false) {
    res.status(403).json({ mensaje: 'Tu cuenta ha sido desactivada. Contacta al administrador' });
    return;
  }

  const asignacion = usuario.usuario_sucursal?.[0];

  if (!asignacion) {
    res.status(403).json({ mensaje: 'El usuario no tiene sucursal ni rol asignado' });
    return;
  }

  req.usuario = {
    auth_id: authData.user.id,
    id_usuario: usuario.id_usuario,
    nombre: usuario.nombre,
    email: usuario.email,
    id_usuario_sucursal: asignacion.id_usuario_sucursal,
    id_rol: (asignacion.rol as any)?.id_rol,
    rol: (asignacion.rol as any)?.nombre,
    id_sucursal: (asignacion.sucursal as any)?.id_sucursal,
    sucursal: (asignacion.sucursal as any)?.nombre,
  };

  next();
};
