import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import type {
  CrearTipoOrdenDto,
  ActualizarTipoOrdenDto,
  TipoOrdenListItem,
  DependenciasTipoOrden,
} from '../domain/interfaces/tipo-orden.interface';

export class TipoOrdenService {

  async listar(): Promise<TipoOrdenListItem[]> {
    const { data, error } = await supabase
      .from('tipo_orden')
      .select('id_tipo_orden, nombre, id_tipo_orden_padre, requiere_mesa, padre:tipo_orden!id_tipo_orden_padre(nombre)')
      .order('id_tipo_orden_padre', { ascending: true, nullsFirst: true })
      .order('nombre', { ascending: true });

    if (error) {
      throw new AppError('Error al listar tipos de orden', 500);
    }

    return (data ?? []).map((item: any) => ({
      id_tipo_orden: item.id_tipo_orden,
      nombre: item.nombre,
      id_tipo_orden_padre: item.id_tipo_orden_padre,
      nombre_padre: item.padre?.nombre ?? null,
      requiere_mesa: item.requiere_mesa,
    }));
  }

  async obtenerPorId(id_tipo_orden: number): Promise<TipoOrdenListItem | null> {
    const { data, error } = await supabase
      .from('tipo_orden')
      .select('id_tipo_orden, nombre, id_tipo_orden_padre, requiere_mesa, padre:tipo_orden!id_tipo_orden_padre(nombre)')
      .eq('id_tipo_orden', id_tipo_orden)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new AppError('Error al obtener tipo de orden', 500);
    }

    return {
      id_tipo_orden: data.id_tipo_orden,
      nombre: data.nombre,
      id_tipo_orden_padre: data.id_tipo_orden_padre,
      nombre_padre: (data as any).padre?.nombre ?? null,
      requiere_mesa: data.requiere_mesa,
    };
  }

  private async existeNombreCI(nombre: string, excluirId?: number): Promise<boolean> {
    let query = supabase
      .from('tipo_orden')
      .select('id_tipo_orden')
      .ilike('nombre', nombre);

    if (excluirId !== undefined) {
      query = query.neq('id_tipo_orden', excluirId);
    }

    const { data, error } = await query;
    if (error) {
      throw new AppError('Error al validar nombre del tipo de orden', 500);
    }
    return (data ?? []).length > 0;
  }

  private async existeId(id: number): Promise<boolean> {
    const { data, error } = await supabase
      .from('tipo_orden')
      .select('id_tipo_orden')
      .eq('id_tipo_orden', id)
      .maybeSingle();

    if (error) {
      throw new AppError('Error al validar tipo de orden padre', 500);
    }
    return !!data;
  }

  private async generaCiclo(idActual: number, idPadrePropuesto: number): Promise<boolean> {
    if (idPadrePropuesto === idActual) return true;

    let cursor: number | null = idPadrePropuesto;
    const visitados = new Set<number>();

    while (cursor !== null) {
      if (visitados.has(cursor)) return true;
      visitados.add(cursor);

      const { data, error } = await supabase
        .from('tipo_orden')
        .select('id_tipo_orden_padre')
        .eq('id_tipo_orden', cursor)
        .maybeSingle();

      if (error) {
        throw new AppError('Error al validar jerarquía de tipos de orden', 500);
      }
      if (!data) return false;

      const padre = data.id_tipo_orden_padre as number | null;
      if (padre === idActual) return true;
      cursor = padre;
    }
    return false;
  }

  async crear(dto: CrearTipoOrdenDto): Promise<TipoOrdenListItem> {
    if (await this.existeNombreCI(dto.nombre)) {
      throw new AppError('Ya existe un tipo de orden con ese nombre', 409);
    }

    if (dto.id_tipo_orden_padre != null) {
      const padreExiste = await this.existeId(dto.id_tipo_orden_padre);
      if (!padreExiste) {
        throw new AppError('El tipo de orden padre no existe', 400);
      }
    }

    const { data, error } = await supabase
      .from('tipo_orden')
      .insert({
        nombre: dto.nombre,
        id_tipo_orden_padre: dto.id_tipo_orden_padre ?? null,
        requiere_mesa: dto.requiere_mesa ?? false,
      })
      .select('id_tipo_orden')
      .single();

    if (error || !data) {
      throw new AppError('Error al crear tipo de orden', 500);
    }

    const creado = await this.obtenerPorId(data.id_tipo_orden);
    if (!creado) {
      throw new AppError('Error al recuperar tipo de orden creado', 500);
    }
    return creado;
  }

  async actualizar(id_tipo_orden: number, dto: ActualizarTipoOrdenDto): Promise<TipoOrdenListItem> {
    const actual = await this.obtenerPorId(id_tipo_orden);
    if (!actual) {
      throw new AppError('Tipo de orden no encontrado', 404);
    }

    if (dto.nombre !== undefined && await this.existeNombreCI(dto.nombre, id_tipo_orden)) {
      throw new AppError('Ya existe un tipo de orden con ese nombre', 409);
    }

    if (dto.id_tipo_orden_padre !== undefined && dto.id_tipo_orden_padre !== null) {
      const padreExiste = await this.existeId(dto.id_tipo_orden_padre);
      if (!padreExiste) {
        throw new AppError('El tipo de orden padre no existe', 400);
      }
      if (await this.generaCiclo(id_tipo_orden, dto.id_tipo_orden_padre)) {
        throw new AppError('La jerarquía generaría un ciclo', 400);
      }
    }

    const updateData: Record<string, any> = {};
    if (dto.nombre !== undefined) updateData.nombre = dto.nombre;
    if (dto.id_tipo_orden_padre !== undefined) updateData.id_tipo_orden_padre = dto.id_tipo_orden_padre;
    if (dto.requiere_mesa !== undefined) updateData.requiere_mesa = dto.requiere_mesa;

    if (Object.keys(updateData).length === 0) {
      return actual;
    }

    const { error } = await supabase
      .from('tipo_orden')
      .update(updateData)
      .eq('id_tipo_orden', id_tipo_orden);

    if (error) {
      throw new AppError('Error al actualizar tipo de orden', 500);
    }

    const actualizado = await this.obtenerPorId(id_tipo_orden);
    if (!actualizado) {
      throw new AppError('Error al recuperar tipo de orden actualizado', 500);
    }
    return actualizado;
  }

  async obtenerDependencias(id_tipo_orden: number): Promise<DependenciasTipoOrden> {
    const existe = await this.existeId(id_tipo_orden);
    if (!existe) {
      throw new AppError('Tipo de orden no encontrado', 404);
    }

    const { data: subtiposData, error: subtiposError } = await supabase
      .from('tipo_orden')
      .select('id_tipo_orden, nombre')
      .eq('id_tipo_orden_padre', id_tipo_orden)
      .order('nombre', { ascending: true });

    if (subtiposError) {
      throw new AppError('Error al consultar subtipos', 500);
    }

    const { data: asignacionesData, error: asignacionesError } = await supabase
      .from('sucursal_tipo_orden')
      .select('id_sucursal, sucursal:sucursal!id_sucursal(nombre)')
      .eq('id_tipo_orden', id_tipo_orden);

    if (asignacionesError) {
      throw new AppError('Error al consultar asignaciones a sucursales', 500);
    }

    const sucursalesMap = new Map<number, string>();
    for (const item of (asignacionesData ?? []) as any[]) {
      if (!sucursalesMap.has(item.id_sucursal)) {
        sucursalesMap.set(item.id_sucursal, item.sucursal?.nombre ?? `Sucursal ${item.id_sucursal}`);
      }
    }

    const subtipos = (subtiposData ?? []).map(s => ({
      id_tipo_orden: s.id_tipo_orden,
      nombre: s.nombre,
    }));

    const sucursales_asignadas = Array.from(sucursalesMap.entries()).map(([id_sucursal, nombre]) => ({
      id_sucursal,
      nombre,
    }));

    return {
      subtipos,
      sucursales_asignadas,
      puede_eliminar: subtipos.length === 0 && sucursales_asignadas.length === 0,
    };
  }

  async eliminar(id_tipo_orden: number): Promise<void> {
    const dependencias = await this.obtenerDependencias(id_tipo_orden);

    if (!dependencias.puede_eliminar) {
      const partes: string[] = [];
      if (dependencias.subtipos.length > 0) {
        partes.push(`tiene ${dependencias.subtipos.length} subtipo(s)`);
      }
      if (dependencias.sucursales_asignadas.length > 0) {
        partes.push(`está asignado a ${dependencias.sucursales_asignadas.length} sucursal(es)`);
      }
      throw new AppError(`No se puede eliminar: ${partes.join(' y ')}.`, 409);
    }

    const { error } = await supabase
      .from('tipo_orden')
      .delete()
      .eq('id_tipo_orden', id_tipo_orden);

    if (error) {
      throw new AppError('Error al eliminar tipo de orden', 500);
    }
  }
}
