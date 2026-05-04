import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { envs } from '../config/envs';
import type { AuthPayload } from '../domain/interfaces/auth.interface';

declare global {
  namespace Express {
    interface Request {
      usuario?: AuthPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ mensaje: 'Token de acceso requerido' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    req.usuario = jwt.verify(token, envs.JWT_SECRET) as AuthPayload;
    next();
  } catch {
    res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
};
