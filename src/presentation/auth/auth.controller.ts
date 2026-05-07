import { Request, Response } from 'express';
import { AuthService } from '../../services/auth.service';
import { validateLogin, validateOlvidarContrasena } from '../../domain/validators/auth.validator';
import { AppError } from '../../helpers/app-error';

export class AuthController {
  constructor(private readonly authService = new AuthService()) {}

  async login(req: Request, res: Response): Promise<void> {
    const { data, error } = validateLogin(req.body);

    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    try {
      const result = await this.authService.login(data!);
      res.json(result);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async olvidarContrasena(req: Request, res: Response): Promise<void> {
    const { data, error } = validateOlvidarContrasena(req.body);

    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    try {
      await this.authService.olvidarContrasena(data!);
      res.json({ mensaje: 'Si el correo está registrado, recibirás un enlace de recuperación' });
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
}
