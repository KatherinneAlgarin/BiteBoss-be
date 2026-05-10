import { Request, Response } from 'express';
import { UsuarioService } from '../../services/usuario.service';
import { validateActualizarPerfil, validateCrearUsuario } from '../../domain/validators/usuario.validator';
import { AppError } from '../../helpers/app-error';

export class UsuarioController {
  constructor(private readonly usuarioService = new UsuarioService()) {}

  async listarUsuarios(req: Request, res: Response): Promise<void> {
    try {
      const esAdmin = req.usuario?.rol === 'admin';
      const id_sucursal = req.usuario?.id_sucursal;
      const usuarios = await this.usuarioService.listarUsuarios(id_sucursal, esAdmin);
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

  obtenerPerfil(req: Request, res: Response): void {
    const perfil = this.usuarioService.obtenerPerfil(req.usuario!);
    res.json(perfil);
  }

  async actualizarPerfil(req: Request, res: Response): Promise<void> {
    const { data, error } = validateActualizarPerfil(req.body);

    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    try {
      const perfil = await this.usuarioService.actualizarPerfil(req.usuario!, data!);
      res.json({ mensaje: 'Perfil actualizado correctamente', usuario: perfil });
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }
}
