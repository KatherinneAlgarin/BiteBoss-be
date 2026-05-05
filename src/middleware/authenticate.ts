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

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ mensaje: 'Token inválido o expirado' });
    return;
  }

  const meta = data.user.app_metadata;

  req.usuario = {
    auth_id:             data.user.id,
    email:               data.user.email ?? '',
    rol:                 meta?.rol ?? '',
    id_sucursal:         meta?.id_sucursal ?? 0,
    id_usuario:          meta?.id_usuario,
    id_rol:              meta?.id_rol,
    id_usuario_sucursal: meta?.id_usuario_sucursal,
    nombre:              meta?.nombre,
  };

  next();
};
