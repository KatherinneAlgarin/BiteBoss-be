import { Request, Response } from 'express';
import { UsuarioService } from '../../services/usuario.service';
import { validateActualizarPerfil, validateCrearUsuario } from '../../domain/validators/usuario.validator';
import { AppError } from '../../helpers/app-error';

export class UsuarioController {
  constructor(private readonly usuarioService = new UsuarioService()) {}

  async generarCodigoEmpleadoAleatorio(_req: Request, res: Response): Promise<void> {
    try {
      const codigo_empleado = await this.usuarioService.generarCodigoEmpleadoAleatorio();
      res.json({ codigo_empleado });
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async listarUsuarios(req: Request, res: Response): Promise<void> {
    try {
      const esAdmin = req.usuario?.rol?.toUpperCase() === 'ADMIN';
      const id_sucursal = req.usuario?.id_sucursal;

      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const id_rol = req.query.id_rol ? Number(req.query.id_rol) : undefined;
      const id_sucursal_filter = req.query.id_sucursal ? Number(req.query.id_sucursal) : undefined;

      const usuarios = await this.usuarioService.listarUsuarios(id_sucursal, esAdmin, {
        search,
        id_rol,
        id_sucursal: id_sucursal_filter,
      });
      res.json(usuarios);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async actualizarUsuario(req: Request, res: Response): Promise<void> {
    try {
      const id_usuario = Number(req.params.id_usuario);
      if (!id_usuario || Number.isNaN(id_usuario)) {
        res.status(400).json({ mensaje: 'Id de usuario inv\u00e1lido' });
        return;
      }

      // Evitar que el admin logueado se modifique a sí mismo
      if (req.usuario && req.usuario.rol && req.usuario.rol.toUpperCase() === 'ADMIN' && req.usuario.id_usuario === id_usuario) {
        res.status(403).json({ mensaje: 'No puedes modificar tu propio usuario desde este panel.' });
        return;
      }

      const { id_rol, id_sucursal, activo } = req.body ?? {};

      const dto: any = {};
      if (id_rol !== undefined) dto.id_rol = Number(id_rol);
      if (id_sucursal !== undefined) dto.id_sucursal = Number(id_sucursal);
      if (activo !== undefined) dto.activo = Boolean(activo);

      await this.usuarioService.actualizarUsuario(id_usuario, dto);

      res.json({ mensaje: 'Permisos del usuario actualizados exitosamente' });
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
