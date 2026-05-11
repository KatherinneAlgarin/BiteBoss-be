import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import { ESTADOS_PEDIDO_TERMINALES } from '../domain/constants/pedido';
import type {
  CrearTipoOrdenDto,
  ActualizarTipoOrdenDto,
  TipoOrdenListItem,
} from '../domain/interfaces/tipo-orden.interface';

const ESTADOS_TERMINALES_PG = `(${ESTADOS_PEDIDO_TERMINALES.map(s => `"${s}"`).join(',')})`;

export class TipoOrdenService {

  async listar(): Promise<TipoOrdenListItem[]> {
    const { data, error } = await supabase
      .from('tipo_orden')
      .select('id_tipo_orden, nombre, id_tipo_orden_padre, requiere_mesa, activo, padre:tipo_orden!id_tipo_orden_padre(nombre)')
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
      activo: item.activo ?? true,
    }));
  }

  async obtenerPorId(id_tipo_orden: number): Promise<TipoOrdenListItem | null> {
    const { data, error } = await supabase
      .from('tipo_orden')
      .select('id_tipo_orden, nombre, id_tipo_orden_padre, requiere_mesa, activo, padre:tipo_orden!id_tipo_orden_padre(nombre)')
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
      activo: (data as any).activo ?? true,
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

  async desactivar(id_tipo_orden: number): Promise<TipoOrdenListItem> {
    const actual = await this.obtenerPorId(id_tipo_orden);
    if (!actual) {
      throw new AppError('Tipo de orden no encontrado', 404);
    }

    const hijos = await this.obtenerHijosRecursivos(id_tipo_orden);
    const todosIds = [id_tipo_orden, ...hijos];

    for (const id of todosIds) {
      if (await this.tienePedidosActivos(id)) {
        throw new AppError('No se puede desactivar: tiene información activa asociada.', 409);
      }
    }

    const { error } = await supabase
      .from('tipo_orden')
      .update({ activo: false })
      .in('id_tipo_orden', todosIds);

    if (error) {
      throw new AppError('Error al desactivar tipo de orden', 500);
    }

    const actualizado = await this.obtenerPorId(id_tipo_orden);
    if (!actualizado) {
      throw new AppError('Error al recuperar tipo de orden desactivado', 500);
    }
    return actualizado;
  }

  async activar(id_tipo_orden: number): Promise<TipoOrdenListItem> {
    const actual = await this.obtenerPorId(id_tipo_orden);
    if (!actual) {
      throw new AppError('Tipo de orden no encontrado', 404);
    }

    // Verificar si el tipo tiene un padre inactivo
    if (actual.id_tipo_orden_padre) {
      const padre = await this.obtenerPorId(actual.id_tipo_orden_padre);
      if (padre && !padre.activo) {
        throw new AppError(`El tipo de orden padre "${padre.nombre}" está inactivo. Debes activarlo primero.`, 409);
      }
    }

    const hijos = await this.obtenerHijosRecursivos(id_tipo_orden);
    const todosIds = [id_tipo_orden, ...hijos];

    const { error } = await supabase
      .from('tipo_orden')
      .update({ activo: true })
      .in('id_tipo_orden', todosIds);

    if (error) {
      throw new AppError('Error al activar tipo de orden', 500);
    }

    const actualizado = await this.obtenerPorId(id_tipo_orden);
    if (!actualizado) {
      throw new AppError('Error al recuperar tipo de orden activado', 500);
    }
    return actualizado;
  }

  private async obtenerHijosRecursivos(id_tipo_orden: number): Promise<number[]> {
    const hijos: number[] = [];

    const { data, error } = await supabase
      .from('tipo_orden')
      .select('id_tipo_orden')
      .eq('id_tipo_orden_padre', id_tipo_orden);

    if (error) {
      throw new AppError('Error al obtener hijos del tipo de orden', 500);
    }

    for (const hijo of data ?? []) {
      hijos.push(hijo.id_tipo_orden);
      const nietos = await this.obtenerHijosRecursivos(hijo.id_tipo_orden);
      hijos.push(...nietos);
    }

    return hijos;
  }

  private async tienePedidosActivos(id_tipo_orden: number): Promise<boolean> {
    const { data: vinculos, error: errorVinc } = await supabase
      .from('sucursal_tipo_orden')
      .select('id_sucursal_tipo_orden')
      .eq('id_tipo_orden', id_tipo_orden);

    if (errorVinc) {
      throw new AppError('Error al validar pedidos del tipo de orden', 500);
    }

    const idsVinculo = (vinculos ?? []).map((v: any) => v.id_sucursal_tipo_orden);
    if (idsVinculo.length === 0) return false;

    const { data: pedidos, error: errorPed } = await supabase
      .from('pedido')
      .select('id_pedido')
      .in('id_sucursal_tipo_orden', idsVinculo)
      .not('estado_operativo', 'in', ESTADOS_TERMINALES_PG)
      .limit(1);

    if (errorPed) {
      // si la tabla pedido aún no estuviera disponible, no bloquear
      return false;
    }
    return (pedidos ?? []).length > 0;
  }
}
