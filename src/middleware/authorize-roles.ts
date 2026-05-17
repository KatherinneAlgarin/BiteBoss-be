import { Request, Response, NextFunction } from 'express';

const normalizeRole = (role: string): string => role.trim().toUpperCase();

export const authorizeRoles = (...roles: string[]) => {
  const allowedRoles = new Set(roles.map(normalizeRole));

  return (req: Request, res: Response, next: NextFunction): void => {
    const rolUsuario = typeof req.usuario?.rol === 'string'
      ? normalizeRole(req.usuario.rol)
      : '';

    if (!rolUsuario || !allowedRoles.has(rolUsuario)) {
      res.status(403).json({ mensaje: 'No tienes permisos para realizar esta acción' });
      return;
    }

    next();
  };
};
