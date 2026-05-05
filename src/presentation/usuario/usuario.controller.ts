import { Request, Response } from 'express';
import { UsuarioService } from '../../services/usuario.service';
import { validateCrearUsuario } from '../../domain/validators/usuario.validator';
import { AppError } from '../../helpers/app-error';

export class UsuarioController {
  constructor(private readonly usuarioService = new UsuarioService()) {}

  async listarUsuarios(_req: Request, res: Response): Promise<void> {
    try {
      const usuarios = await this.usuarioService.listarUsuarios();
      res.json(usuarios);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async listarRoles(_req: Request, res: Response): Promise<void> {
    try {
      const roles = await this.usuarioService.listarRoles();
      res.json(roles);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async listarSucursales(_req: Request, res: Response): Promise<void> {
    try {
      const sucursales = await this.usuarioService.listarSucursales();
      res.json(sucursales);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async crearUsuario(req: Request, res: Response): Promise<void> {
    const { data, error } = validateCrearUsuario(req.body);

    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    try {
      const usuarioCreado = await this.usuarioService.crearUsuario(data!);
      res.status(201).json(usuarioCreado);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
}
