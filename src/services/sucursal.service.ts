import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import type {
  SucursalItem,
  SucursalDetalle,
  CrearSucursalDto,
  ActualizarSucursalDto,
  DependenciasSucursal,
} from '../domain/interfaces/sucursal.interface';

export class SucursalService {

  async listar(soloActivas = false): Promise<SucursalItem[]> {
    let query = supabase
      .from('sucursal')
      .select('id_sucursal, nombre, direccion, activo')
      .order('nombre', { ascending: true });

    if (soloActivas) {
      query = query.eq('activo', true);
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError('Error al listar sucursales', 500);
    }

    return (data ?? []).map((s: any) => ({
      id_sucursal: s.id_sucursal,
      nombre: s.nombre,
      direccion: s.direccion ?? null,
      activo: s.activo ?? true,
    }));
  }

  async obtenerPorId(id_sucursal: number): Promise<SucursalDetalle | null> {
    const { data: sucursal, error } = await supabase
      .from('sucursal')
      .select('id_sucursal, nombre, direccion, activo')
      .eq('id_sucursal', id_sucursal)
      .maybeSingle();

    if (error) {
      throw new AppError('Error al obtener sucursal', 500);
    }
    if (!sucursal) return null;

    const [tiposOrden, tiposPago] = await Promise.all([
      this.obtenerTiposOrdenVinculados(id_sucursal),
      this.obtenerTiposPagoVinculados(id_sucursal),
    ]);

    return {
      id_sucursal: sucursal.id_sucursal,
      nombre: sucursal.nombre,
      direccion: sucursal.direccion ?? null,
      activo: sucursal.activo ?? true,
      tipos_orden: tiposOrden,
      tipos_pago: tiposPago,
    };
  }

  private async obtenerTiposOrdenVinculados(id_sucursal: number) {
    const { data, error } = await supabase
      .from('sucursal_tipo_orden')
      .select('tipo_orden:tipo_orden!id_tipo_orden(id_tipo_orden, nombre)')
      .eq('id_sucursal', id_sucursal);

    if (error) {
      throw new AppError('Error al obtener tipos de orden vinculados', 500);
    }

    return (data ?? [])
      .map((row: any) => row.tipo_orden)
      .filter(Boolean)
      .map((t: any) => ({ id_tipo_orden: t.id_tipo_orden, nombre: t.nombre }));
  }

  private async obtenerTiposPagoVinculados(id_sucursal: number) {
    const { data, error } = await supabase
      .from('sucursal_metodo_pago')
      .select('activo, tipo_pago:tipo_pago!id_tipo_pago(id_tipo_pago, nombre)')
      .eq('id_sucursal', id_sucursal)
      .eq('activo', true);

    if (error) {
      throw new AppError('Error al obtener tipos de pago vinculados', 500);
    }

    return (data ?? [])
      .map((row: any) => row.tipo_pago)
      .filter(Boolean)
      .map((t: any) => ({ id_tipo_pago: t.id_tipo_pago, nombre: t.nombre }));
  }

  private async existeNombreCI(nombre: string, excluirId?: number): Promise<boolean> {
    let query = supabase
      .from('sucursal')
      .select('id_sucursal')
      .ilike('nombre', nombre);

    if (excluirId !== undefined) {
      query = query.neq('id_sucursal', excluirId);
    }

    const { data, error } = await query;
    if (error) {
      throw new AppError('Error al validar nombre de la sucursal', 500);
    }
    return (data ?? []).length > 0;
  }

  async crear(dto: CrearSucursalDto): Promise<SucursalDetalle> {
    if (await this.existeNombreCI(dto.nombre)) {
      throw new AppError('Ya existe una sucursal con ese nombre', 409);
    }

    const { data: insertada, error } = await supabase
      .from('sucursal')
      .insert({
        nombre: dto.nombre,
        direccion: dto.direccion ?? null,
        activo: true,
      })
      .select('id_sucursal')
      .single();

    if (error || !insertada) {
      throw new AppError('Error al crear la sucursal', 500);
    }

    const id_sucursal = insertada.id_sucursal;

    try {
      await this.reemplazarTiposOrden(id_sucursal, dto.tipos_orden);
      await this.reemplazarTiposPago(id_sucursal, dto.tipos_pago);
    } catch (vinculacionError) {
      await supabase.from('sucursal').delete().eq('id_sucursal', id_sucursal);
      throw vinculacionError;
    }

    const detalle = await this.obtenerPorId(id_sucursal);
    if (!detalle) {
      throw new AppError('Error al recuperar la sucursal creada', 500);
    }
    return detalle;
  }

  async actualizar(id_sucursal: number, dto: ActualizarSucursalDto): Promise<SucursalDetalle> {
    const actual = await this.obtenerPorId(id_sucursal);
    if (!actual) {
      throw new AppError('Sucursal no encontrada', 404);
    }

    if (dto.nombre !== undefined && await this.existeNombreCI(dto.nombre, id_sucursal)) {
      throw new AppError('Ya existe una sucursal con ese nombre', 409);
    }

    const updateData: Record<string, any> = {};
    if (dto.nombre !== undefined) updateData.nombre = dto.nombre;
    if (dto.direccion !== undefined) updateData.direccion = dto.direccion;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('sucursal')
        .update(updateData)
        .eq('id_sucursal', id_sucursal);

      if (error) {
        throw new AppError('Error al actualizar la sucursal', 500);
      }
    }

    if (dto.tipos_orden !== undefined) {
      await this.reemplazarTiposOrden(id_sucursal, dto.tipos_orden);
    }
    if (dto.tipos_pago !== undefined) {
      await this.reemplazarTiposPago(id_sucursal, dto.tipos_pago);
    }

    const actualizada = await this.obtenerPorId(id_sucursal);
    if (!actualizada) {
      throw new AppError('Error al recuperar la sucursal actualizada', 500);
    }
    return actualizada;
  }

  async desactivar(id_sucursal: number): Promise<SucursalItem> {
    if (await this.tieneUsuariosActivos(id_sucursal)) {
      throw new AppError(
        'No se puede desactivar: la sucursal tiene información activa asociada.',
        409,
      );
    }

    await this.eliminarZonasYMesasDeSucursal(id_sucursal);

    const { data, error } = await supabase
      .from('sucursal')
      .update({ activo: false })
      .eq('id_sucursal', id_sucursal)
      .select('id_sucursal, nombre, direccion, activo')
      .single();

    if (error || !data) {
      throw new AppError('Error al desactivar la sucursal', 500);
    }

    return {
      id_sucursal: data.id_sucursal,
      nombre: data.nombre,
      direccion: data.direccion ?? null,
      activo: data.activo ?? false,
    };
  }

  async obtenerDependencias(id_sucursal: number): Promise<DependenciasSucursal> {
    const usuariosActivos = await this.contarUsuariosActivos(id_sucursal);
    const zonas = await this.listarZonasDeSucursal(id_sucursal);
    const mesas = zonas.length > 0
      ? await this.contarMesasEnZonas(zonas.map(z => z.id_zona))
      : 0;

    const puedeDesactivar = usuariosActivos === 0;

    return {
      usuarios_activos: usuariosActivos,
      zonas_asociadas: zonas,
      mesas_asociadas: mesas,
      puede_desactivar: puedeDesactivar,
      requiere_eliminar_zonas: puedeDesactivar && zonas.length > 0,
    };
  }

  async activar(id_sucursal: number): Promise<SucursalItem> {
    const { data, error } = await supabase
      .from('sucursal')
      .update({ activo: true })
      .eq('id_sucursal', id_sucursal)
      .select('id_sucursal, nombre, direccion, activo')
      .single();

    if (error || !data) {
      throw new AppError('Error al activar la sucursal', 500);
    }

    return {
      id_sucursal: data.id_sucursal,
      nombre: data.nombre,
      direccion: data.direccion ?? null,
      activo: data.activo ?? true,
    };
  }

  private async tieneUsuariosActivos(id_sucursal: number): Promise<boolean> {
    return (await this.contarUsuariosActivos(id_sucursal)) > 0;
  }

  private async contarUsuariosActivos(id_sucursal: number): Promise<number> {
    const { data, error } = await supabase
      .from('usuario_sucursal')
      .select('usuario:usuario!id_usuario(activo)')
      .eq('id_sucursal', id_sucursal);

    if (error) {
      throw new AppError('Error al validar información asociada a la sucursal', 500);
    }

    return (data ?? []).filter((row: any) => row.usuario?.activo === true).length;
  }

  private async listarZonasDeSucursal(id_sucursal: number): Promise<{ id_zona: number; nombre: string }[]> {
    const { data, error } = await supabase
      .from('zona')
      .select('id_zona, nombre')
      .eq('id_sucursal', id_sucursal);

    if (error) {
      // si la tabla zona no existiera, devolver vacío
      return [];
    }
    return (data ?? []).map((z: any) => ({ id_zona: z.id_zona, nombre: z.nombre }));
  }

  private async contarMesasEnZonas(ids_zona: number[]): Promise<number> {
    if (ids_zona.length === 0) return 0;
    const { data, error } = await supabase
      .from('mesa')
      .select('id_mesa')
      .in('id_zona', ids_zona);

    if (error) return 0;
    return (data ?? []).length;
  }

  private async eliminarZonasYMesasDeSucursal(id_sucursal: number): Promise<void> {
    const zonas = await this.listarZonasDeSucursal(id_sucursal);
    if (zonas.length === 0) return;

    const ids_zona = zonas.map(z => z.id_zona);

    // Eliminar mesas primero (FK a zona)
    const { error: errorMesas } = await supabase
      .from('mesa')
      .delete()
      .in('id_zona', ids_zona);

    if (errorMesas) {
      throw new AppError('Error al eliminar mesas asociadas a la sucursal', 500);
    }

    // Eliminar zonas
    const { error: errorZonas } = await supabase
      .from('zona')
      .delete()
      .eq('id_sucursal', id_sucursal);

    if (errorZonas) {
      throw new AppError('Error al eliminar zonas asociadas a la sucursal', 500);
    }
  }

  private async reemplazarTiposOrden(id_sucursal: number, ids: number[]): Promise<void> {
    const { error: errorDelete } = await supabase
      .from('sucursal_tipo_orden')
      .delete()
      .eq('id_sucursal', id_sucursal);

    if (errorDelete) {
      throw new AppError('Error al actualizar tipos de orden vinculados', 500);
    }

    if (ids.length === 0) return;

    const filas = ids.map(id_tipo_orden => ({ id_sucursal, id_tipo_orden }));
    const { error: errorInsert } = await supabase
      .from('sucursal_tipo_orden')
      .insert(filas);

    if (errorInsert) {
      throw new AppError('Error al vincular tipos de orden a la sucursal', 500);
    }
  }

  private async reemplazarTiposPago(id_sucursal: number, ids: number[]): Promise<void> {
    const { error: errorDelete } = await supabase
      .from('sucursal_metodo_pago')
      .delete()
      .eq('id_sucursal', id_sucursal);

    if (errorDelete) {
      throw new AppError('Error al actualizar métodos de pago vinculados', 500);
    }

    if (ids.length === 0) return;

    const filas = ids.map(id_tipo_pago => ({ id_sucursal, id_tipo_pago, activo: true }));
    const { error: errorInsert } = await supabase
      .from('sucursal_metodo_pago')
      .insert(filas);

    if (errorInsert) {
      throw new AppError('Error al vincular métodos de pago a la sucursal', 500);
    }
  }
}
