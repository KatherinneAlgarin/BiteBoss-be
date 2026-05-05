import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import type {
  CrearUsuarioDto,
  RolItem,
  SucursalItem,
  UsuarioCreadoResponse,
  UsuarioListItem,
} from '../domain/interfaces/usuario.interface';

export class UsuarioService {

  async listarUsuarios(id_sucursal?: number, esAdmin = false): Promise<UsuarioListItem[]> {
    let query = supabase
      .from('usuario')
      .select(`
        id_usuario,
        nombre,
        email,
        activo,
        usuario_sucursal (
          id_usuario_sucursal,
          rol ( id_rol, nombre ),
          sucursal ( id_sucursal, nombre )
        )
      `)
      .eq('activo', true)
      .order('nombre');

    if (!esAdmin && id_sucursal) {
      query = query.eq('usuario_sucursal.id_sucursal', id_sucursal);
    }

    const { data, error } = await query;

    if (error) throw new AppError('Error al obtener usuarios', 500);

    return (data ?? []).map((u: any) => {
      const asignacion = u.usuario_sucursal?.[0];
      return {
        id_usuario:          u.id_usuario,
        nombre:              u.nombre,
        email:               u.email,
        activo:              u.activo,
        id_usuario_sucursal: asignacion?.id_usuario_sucursal ?? null,
        id_rol:              asignacion?.rol?.id_rol ?? null,
        rol:                 asignacion?.rol?.nombre ?? null,
        id_sucursal:         asignacion?.sucursal?.id_sucursal ?? null,
        sucursal:            asignacion?.sucursal?.nombre ?? null,
      };
    });
  }

  async listarRoles(): Promise<RolItem[]> {
    const { data, error } = await supabase
      .from('rol')
      .select('id_rol, nombre')
      .order('nombre');

    if (error) throw new AppError('Error al obtener roles', 500);
    return data ?? [];
  }

  async listarSucursales(): Promise<SucursalItem[]> {
    const { data, error } = await supabase
      .from('sucursal')
      .select('id_sucursal, nombre')
      .order('nombre');

    if (error) throw new AppError('Error al obtener sucursales', 500);
    return data ?? [];
  }

  async crearUsuario(dto: CrearUsuarioDto): Promise<UsuarioCreadoResponse> {
  const { nombre, email, password, id_rol, id_sucursal } = dto;

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
    .insert({ nombre, email, activo: true })
    .select('id_usuario')
    .single();

  if (usuarioError || !usuarioData) {
    await supabase.auth.admin.deleteUser(authData.user.id);
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

}
