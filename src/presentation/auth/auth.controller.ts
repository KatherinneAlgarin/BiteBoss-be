import { Request, Response } from 'express';
import { AuthService } from '../../services/auth.service';
import { validateOlvidarContrasena } from '../../domain/validators/auth.validator';
import { AppError } from '../../helpers/app-error';

export class AuthController {
  constructor(private readonly authService = new AuthService()) {}


  async me(req: Request, res: Response): Promise<void> {
  res.json({ usuario: req.usuario });
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
