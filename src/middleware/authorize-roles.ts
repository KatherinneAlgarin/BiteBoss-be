import { Request, Response, NextFunction } from 'express';

export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const rolUsuario = req.usuario?.rol;

    if (!rolUsuario || !roles.includes(rolUsuario)) {
      res.status(403).json({ mensaje: 'No tienes permisos para realizar esta acción' });
      return;
    }

    next();
  };
};
