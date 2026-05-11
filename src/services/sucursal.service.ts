import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import { ESTADOS_PEDIDO_TERMINALES } from '../domain/constants/pedido';
import type {
  SucursalItem,
  SucursalDetalle,
  CrearSucursalDto,
  ActualizarSucursalDto,
  DependenciasSucursal,
} from '../domain/interfaces/sucursal.interface';

const ESTADOS_TERMINALES_PG = `(${ESTADOS_PEDIDO_TERMINALES.map(s => `"${s}"`).join(',')})`;

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
      .select('activo, tipo_orden:tipo_orden!id_tipo_orden!inner(id_tipo_orden, nombre, activo)')
      .eq('id_sucursal', id_sucursal)
      .eq('activo', true)
      .eq('tipo_orden.activo', true);

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
      .select('activo, tipo_pago:tipo_pago!id_tipo_pago!inner(id_tipo_pago, nombre, activo)')
      .eq('id_sucursal', id_sucursal)
      .eq('activo', true)
      .eq('tipo_pago.activo', true);

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
    const { data: actuales, error: errorSelect } = await supabase
      .from('sucursal_tipo_orden')
      .select('id_sucursal_tipo_orden, id_tipo_orden, activo, tipo_orden:tipo_orden!id_tipo_orden(nombre)')
      .eq('id_sucursal', id_sucursal);

    if (errorSelect) {
      throw new AppError('Error al leer tipos de orden vinculados', 500);
    }

    const nuevosSet = new Set(ids);
    const filas = (actuales ?? []) as any[];

    const aDesactivar = filas.filter(row => row.activo === true && !nuevosSet.has(row.id_tipo_orden));
    const aReactivar = filas.filter(row => row.activo === false && nuevosSet.has(row.id_tipo_orden));
    const existentesSet = new Set(filas.map(row => row.id_tipo_orden));
    const aCrear = ids.filter(id => !existentesSet.has(id));

    for (const vinculo of aDesactivar) {
      const enUso = await this.tipoOrdenTienePedidosActivos(vinculo.id_sucursal_tipo_orden);
      if (enUso) {
        const nombre = vinculo.tipo_orden?.nombre ?? `#${vinculo.id_tipo_orden}`;
        throw new AppError(
          `No se puede quitar el tipo de orden "${nombre}" porque tiene pedidos activos en esta sucursal.`,
          409,
        );
      }
    }

    for (const vinculo of aDesactivar) {
      const { error } = await supabase
        .from('sucursal_tipo_orden')
        .update({ activo: false })
        .eq('id_sucursal_tipo_orden', vinculo.id_sucursal_tipo_orden);
      if (error) {
        throw new AppError('Error al desactivar vínculo de tipo de orden', 500);
      }
    }

    for (const vinculo of aReactivar) {
      const { error } = await supabase
        .from('sucursal_tipo_orden')
        .update({ activo: true })
        .eq('id_sucursal_tipo_orden', vinculo.id_sucursal_tipo_orden);
      if (error) {
        throw new AppError('Error al reactivar vínculo de tipo de orden', 500);
      }
    }

    if (aCrear.length > 0) {
      const nuevasFilas = aCrear.map(id_tipo_orden => ({ id_sucursal, id_tipo_orden, activo: true }));
      const { error: errorInsert } = await supabase
        .from('sucursal_tipo_orden')
        .insert(nuevasFilas);
      if (errorInsert) {
        throw new AppError('Error al vincular tipos de orden a la sucursal', 500);
      }
    }
  }

  private async reemplazarTiposPago(id_sucursal: number, ids: number[]): Promise<void> {
    const { data: actuales, error: errorSelect } = await supabase
      .from('sucursal_metodo_pago')
      .select('id_sucursal_pago, id_tipo_pago, activo, tipo_pago:tipo_pago!id_tipo_pago(nombre)')
      .eq('id_sucursal', id_sucursal);

    if (errorSelect) {
      throw new AppError('Error al leer métodos de pago vinculados', 500);
    }

    const nuevosSet = new Set(ids);
    const filas = (actuales ?? []) as any[];

    const aDesactivar = filas.filter(row => row.activo === true && !nuevosSet.has(row.id_tipo_pago));
    const aReactivar = filas.filter(row => row.activo === false && nuevosSet.has(row.id_tipo_pago));
    const existentesSet = new Set(filas.map(row => row.id_tipo_pago));
    const aCrear = ids.filter(id => !existentesSet.has(id));

    for (const vinculo of aDesactivar) {
      const enUso = await this.tipoPagoTienePedidosActivos(id_sucursal, vinculo.id_tipo_pago);
      if (enUso) {
        const nombre = vinculo.tipo_pago?.nombre ?? `#${vinculo.id_tipo_pago}`;
        throw new AppError(
          `No se puede quitar el método de pago "${nombre}" porque tiene pedidos activos en esta sucursal.`,
          409,
        );
      }
    }

    for (const vinculo of aDesactivar) {
      const { error } = await supabase
        .from('sucursal_metodo_pago')
        .update({ activo: false })
        .eq('id_sucursal_pago', vinculo.id_sucursal_pago);
      if (error) {
        throw new AppError('Error al desactivar vínculo de método de pago', 500);
      }
    }

    for (const vinculo of aReactivar) {
      const { error } = await supabase
        .from('sucursal_metodo_pago')
        .update({ activo: true })
        .eq('id_sucursal_pago', vinculo.id_sucursal_pago);
      if (error) {
        throw new AppError('Error al reactivar vínculo de método de pago', 500);
      }
    }

    if (aCrear.length > 0) {
      const nuevasFilas = aCrear.map(id_tipo_pago => ({ id_sucursal, id_tipo_pago, activo: true }));
      const { error: errorInsert } = await supabase
        .from('sucursal_metodo_pago')
        .insert(nuevasFilas);
      if (errorInsert) {
        throw new AppError('Error al vincular métodos de pago a la sucursal', 500);
      }
    }
  }

  private async tipoOrdenTienePedidosActivos(id_sucursal_tipo_orden: number): Promise<boolean> {
    const { data, error } = await supabase
      .from('pedido')
      .select('id_pedido')
      .eq('id_sucursal_tipo_orden', id_sucursal_tipo_orden)
      .not('estado_operativo', 'in', ESTADOS_TERMINALES_PG)
      .limit(1);

    if (error) {
      return false;
    }
    return (data ?? []).length > 0;
  }

  private async tipoPagoTienePedidosActivos(id_sucursal: number, id_tipo_pago: number): Promise<boolean> {
    const { data, error } = await supabase
      .from('pago_pedido')
      .select('id_pago_pedido, pedido:pedido!id_pedido!inner(id_sucursal, estado_operativo)')
      .eq('id_metodo_pago', id_tipo_pago)
      .eq('pedido.id_sucursal', id_sucursal)
      .not('pedido.estado_operativo', 'in', ESTADOS_TERMINALES_PG)
      .limit(1);

    if (error) {
      return false;
    }
    return (data ?? []).length > 0;
  }
}
