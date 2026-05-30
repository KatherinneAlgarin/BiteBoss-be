import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import type { AuthPayload } from '../domain/interfaces/auth.interface';
import type {
  ActualizarPerfilDto,
  CrearUsuarioDto,
  PerfilResponse,
  RolItem,
  UsuarioCreadoResponse,
  UsuarioListItem,
} from '../domain/interfaces/usuario.interface';

export class UsuarioService {

  async generarCodigoEmpleadoAleatorio(): Promise<string> {
    const MAX_INTENTOS = 50;

    for (let i = 0; i < MAX_INTENTOS; i++) {
      const codigo = String(Math.floor(1000 + Math.random() * 9000));

      const { data, error } = await supabase
        .from('usuario')
        .select('id_usuario')
        .eq('codigo_empleado', codigo)
        .limit(1);

      if (error) {
        throw new AppError('No se pudo generar un código de empleado', 500);
      }

      if ((data ?? []).length === 0) {
        return codigo;
      }
    }

    throw new AppError('No hay códigos de empleado disponibles en este momento', 409);
  }

  async listarUsuarios(
    id_sucursal_usuario?: number,
    esAdmin = false,
    filtros?: { search?: string; id_rol?: number; id_sucursal?: number }
  ): Promise<UsuarioListItem[]> {
    let query = supabase
      .from('usuario')
      .select(`
        id_usuario,
        nombre,
        email,
        activo,
        usuario_sucursal (
          id_usuario_sucursal,
          id_rol,
          rol ( id_rol, nombre ),
          id_sucursal,
          sucursal ( id_sucursal, nombre )
        )
      `);

    // Si no es admin, sólo mostrar activos
    if (!esAdmin) {
      query = query.eq('activo', true);
    }

    // Si no es admin, forzar filtro por la sucursal del usuario
    if (!esAdmin && id_sucursal_usuario) {
      query = query.eq('usuario_sucursal.id_sucursal', id_sucursal_usuario);
    }

    // Filtros de búsqueda y por rol/sucursal (sólo aplican si los provee el admin)
    if (filtros) {
      const { search, id_rol, id_sucursal } = filtros;

      if (search && typeof search === 'string' && search.trim().length > 0) {
        const q = `%${search.trim()}%`;
        query = query.or(`nombre.ilike.${q},email.ilike.${q}`);
      }

      if (typeof id_rol === 'number' && id_rol > 0) {
        query = query.eq('usuario_sucursal.id_rol', id_rol);
      }

      if (typeof id_sucursal === 'number' && id_sucursal > 0) {
        query = query.eq('usuario_sucursal.id_sucursal', id_sucursal);
      }
    }

    const { data, error } = await query.order('nombre');

    if (error) throw new AppError('Error al obtener usuarios', 500);

    return (data ?? []).map((u: any) => {
      const asignacion = u.usuario_sucursal?.[0];
      return {
        id_usuario:          u.id_usuario,
        nombre:              u.nombre,
        email:               u.email,
        activo:              u.activo,
        id_usuario_sucursal: asignacion?.id_usuario_sucursal ?? null,
        id_rol:              asignacion?.id_rol ?? asignacion?.rol?.id_rol ?? null,
        rol:                 asignacion?.rol?.nombre ?? null,
        id_sucursal:         asignacion?.id_sucursal ?? asignacion?.sucursal?.id_sucursal ?? null,
        sucursal:            asignacion?.sucursal?.nombre ?? null,
      };
    });
  }

  async actualizarUsuario(id_usuario: number, dto: { id_rol?: number; id_sucursal?: number; activo?: boolean }): Promise<void> {
    const { id_rol, id_sucursal, activo } = dto;

    // Obtener usuario
    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuario')
      .select('id_usuario, nombre, email')
      .eq('id_usuario', id_usuario)
      .limit(1)
      .single();

    if (usuarioError || !usuarioData) throw new AppError('Usuario no encontrado', 404);

    // Actualizar estado si viene
    if (typeof activo === 'boolean') {
      const { error: updError } = await supabase
        .from('usuario')
        .update({ activo })
        .eq('id_usuario', id_usuario);

      if (updError) throw new AppError('Error al actualizar estado del usuario', 500);
    }

    // Actualizar o insertar asignación sucursal/rol
    if (typeof id_rol === 'number' || typeof id_sucursal === 'number') {
      const { data: asignaciones, error: asigError } = await supabase
        .from('usuario_sucursal')
        .select('id_usuario_sucursal')
        .eq('id_usuario', id_usuario)
        .limit(1);

      if (asigError) throw new AppError('Error al obtener asignación de sucursal', 500);

      if (asignaciones && asignaciones.length > 0) {
        const id_usuario_sucursal = asignaciones[0].id_usuario_sucursal;
        const updateObj: any = {};
        if (typeof id_rol === 'number') updateObj.id_rol = id_rol;
        if (typeof id_sucursal === 'number') updateObj.id_sucursal = id_sucursal;

        const { error: updAsigErr } = await supabase
          .from('usuario_sucursal')
          .update(updateObj)
          .eq('id_usuario_sucursal', id_usuario_sucursal);

        if (updAsigErr) throw new AppError('Error al actualizar asignación de sucursal/rol', 500);
      } else {
        const insertObj: any = { id_usuario };
        if (typeof id_rol === 'number') insertObj.id_rol = id_rol;
        if (typeof id_sucursal === 'number') insertObj.id_sucursal = id_sucursal;

        const { error: insErr } = await supabase.from('usuario_sucursal').insert(insertObj);
        if (insErr) throw new AppError('Error al crear asignación de sucursal/rol', 500);
      }
    }

    // Actualizar metadata en Supabase Auth (buscar usuario con app_metadata.id_usuario)
    try {
      const list = await (supabase.auth.admin.listUsers() as any);
      const users = (list?.data?.users) ?? list?.users ?? [];
      const found = users.find((u: any) => {
        return u?.app_metadata?.id_usuario === id_usuario || u?.app_metadata?.id_usuario === String(id_usuario);
      });

      if (found) {
        const meta: any = {
          id_usuario: usuarioData.id_usuario,
          nombre: usuarioData.nombre,
          rol: undefined,
          id_rol: undefined,
          id_sucursal: undefined,
          id_usuario_sucursal: undefined,
          sucursal: undefined,
        };

        if (typeof id_rol === 'number') meta.id_rol = id_rol;
        if (typeof id_sucursal === 'number') meta.id_sucursal = id_sucursal;

        // Intentar obtener nombres legibles para rol y sucursal
        if (typeof id_rol === 'number') {
          const { data: rolData } = await supabase.from('rol').select('nombre').eq('id_rol', id_rol).single();
          meta.rol = (rolData as any)?.nombre ?? undefined;
        }

        if (typeof id_sucursal === 'number') {
          const { data: sucData } = await supabase.from('sucursal').select('nombre').eq('id_sucursal', id_sucursal).single();
          meta.sucursal = (sucData as any)?.nombre ?? undefined;
        }

        await supabase.auth.admin.updateUserById(found.id, { app_metadata: meta });
      }
    } catch (e) {
      // No detener el flujo por fallas al actualizar metadata externa
      console.error('Warning: no se pudo actualizar metadata en Auth:', e);
    }
  }

  async listarRoles(): Promise<RolItem[]> {
    const { data, error } = await supabase
      .from('rol')
      .select('id_rol, nombre')
      .order('nombre');

    if (error) throw new AppError('Error al obtener roles', 500);
    return data ?? [];
  }

  async crearUsuario(dto: CrearUsuarioDto): Promise<UsuarioCreadoResponse> {
  const { nombre, email, password, codigo_empleado, id_rol, id_sucursal } = dto;

  const { data: existente } = await supabase
    .from('usuario')
    .select('id_usuario')
    .eq('email', email)
    .limit(1);

  if (existente && existente.length > 0) {
    throw new AppError('El correo ingresado ya está registrado', 409);
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.toLowerCase().includes('already registered')) {
      throw new AppError('El correo ingresado ya está registrado', 409);
    }
    throw new AppError('Error al crear la cuenta de acceso', 500);
  }

  const { data: usuarioData, error: usuarioError } = await supabase
    .from('usuario')
    .insert({ nombre, email, activo: true, codigo_empleado: codigo_empleado ?? null })
    .select('id_usuario')
    .single();

  if (usuarioError || !usuarioData) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    if ((usuarioError as any)?.code === '23505') {
      throw new AppError('El código de empleado ingresado ya está registrado', 409);
    }
    throw new AppError('Error al registrar el usuario', 500);
  }

  // ← agregar .select() para obtener el id generado
  const { data: asignacionData, error: asignacionError } = await supabase
    .from('usuario_sucursal')
    .insert({ id_usuario: usuarioData.id_usuario, id_sucursal, id_rol })
    .select('id_usuario_sucursal')
    .single();

  if (asignacionError || !asignacionData) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new AppError('Error al asignar sucursal y rol al usuario', 500);
  }

  const [{ data: rolData }, { data: sucursalData }] = await Promise.all([
    supabase.from('rol').select('nombre').eq('id_rol', id_rol).single(),
    supabase.from('sucursal').select('nombre').eq('id_sucursal', id_sucursal).single(),
  ]);

  const rolNombre      = (rolData as any)?.nombre ?? '';
  const sucursalNombre = (sucursalData as any)?.nombre ?? '';

  await supabase.auth.admin.updateUserById(authData.user.id, {
    app_metadata: {
      id_usuario:          usuarioData.id_usuario,
      nombre,
      rol:                 rolNombre,
      id_rol,
      id_sucursal,
      id_usuario_sucursal: asignacionData.id_usuario_sucursal,
      sucursal:            sucursalNombre,
    },
  });

  return {
    id_usuario: usuarioData.id_usuario,
    nombre,
    email,
    rol:      rolNombre,
    sucursal: sucursalNombre,
  };
}

  obtenerPerfil(usuario: AuthPayload): PerfilResponse {
    return {
      nombre: usuario.nombre ?? '',
      email:  usuario.email,
    };
  }

  async actualizarPerfil(usuario: AuthPayload, dto: ActualizarPerfilDto): Promise<PerfilResponse> {
    const { nombre, nuevaContrasena } = dto;

    if (nombre) {
      const { error: dbError } = await supabase
        .from('usuario')
        .update({ nombre })
        .eq('id_usuario', usuario.id_usuario!);

      if (dbError) throw new AppError('Error al actualizar el nombre', 500);

      const { error: metaError } = await supabase.auth.admin.updateUserById(usuario.auth_id, {
        app_metadata: {
          id_usuario:          usuario.id_usuario,
          nombre,
          rol:                 usuario.rol,
          id_rol:              usuario.id_rol,
          id_sucursal:         usuario.id_sucursal,
          id_usuario_sucursal: usuario.id_usuario_sucursal,
          sucursal:            usuario.sucursal,
        },
      });

      if (metaError) throw new AppError('Error al actualizar el nombre', 500);
    }

    if (nuevaContrasena) {
      const { error: passError } = await supabase.auth.admin.updateUserById(usuario.auth_id, {
        password: nuevaContrasena,
      });

      if (passError) throw new AppError('Error al actualizar la contraseña', 500);
    }

    return {
      nombre: nombre ?? usuario.nombre ?? '',
      email:  usuario.email,
    };
  }

}
