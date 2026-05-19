import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import type {
  BodegaItem,
  CrearBodegaDto,
  ActualizarBodegaDto,
  StockBodegaResult,
} from '../domain/interfaces/bodega.interface';

export class BodegaService {

  async listar(id_sucursal?: number): Promise<BodegaItem[]> {
    let query = supabase
      .from('bodega')
      .select('id_bodega, nombre, tipo, descripcion, activo, id_sucursal, sucursal:sucursal!id_sucursal(nombre)')
      .order('nombre', { ascending: true });

    if (id_sucursal) {
      query = query.eq('id_sucursal', id_sucursal);
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError('Error al listar bodegas', 500);
    }

    return (data ?? []).map((b: any) => ({
      id_bodega: b.id_bodega,
      nombre: b.nombre,
      tipo: b.tipo,
      activo: b.activo ?? true,
      descripcion: b.descripcion ?? null,
      id_sucursal: b.id_sucursal,
      sucursal: b.sucursal?.nombre ?? undefined,
    }));
  }

  async obtenerPorId(id_bodega: number): Promise<BodegaItem | null> {
    const { data, error } = await supabase
      .from('bodega')
      .select('id_bodega, nombre, tipo, descripcion, activo, id_sucursal, sucursal:sucursal!id_sucursal(nombre)')
      .eq('id_bodega', id_bodega)
      .maybeSingle();

    if (error) {
      throw new AppError('Error al obtener bodega', 500);
    }
    if (!data) return null;

    return {
      id_bodega: data.id_bodega,
      nombre: data.nombre,
      tipo: data.tipo,
      descripcion: (data as any).descripcion ?? null,
      activo: data.activo ?? true,
      id_sucursal: data.id_sucursal,
      sucursal: (data as any).sucursal?.nombre ?? undefined,
    };
  }

  async crear(dto: CrearBodegaDto): Promise<BodegaItem> {
    if (await this.existeNombreEnSucursal(dto.nombre, dto.id_sucursal)) {
      throw new AppError('Ya existe una bodega con ese nombre en esta sucursal', 409);
    }

    const { data, error } = await supabase
      .from('bodega')
      .insert({ nombre: dto.nombre, tipo: dto.tipo, descripcion: dto.descripcion ?? null, id_sucursal: dto.id_sucursal, activo: true })
      .select('id_bodega')
      .single();

    if (error || !data) {
      throw new AppError('Error al crear la bodega', 500);
    }

    const bodega = await this.obtenerPorId(data.id_bodega);
    if (!bodega) throw new AppError('Error al recuperar la bodega creada', 500);
    return bodega;
  }

  async actualizar(id_bodega: number, dto: ActualizarBodegaDto): Promise<BodegaItem> {
    const actual = await this.obtenerPorId(id_bodega);
    if (!actual) throw new AppError('Bodega no encontrada', 404);

    if (dto.nombre !== undefined && await this.existeNombreEnSucursal(dto.nombre, actual.id_sucursal, id_bodega)) {
      throw new AppError('Ya existe una bodega con ese nombre en esta sucursal', 409);
    }

    const updateData: Record<string, any> = {};
    if (dto.nombre !== undefined) updateData.nombre = dto.nombre;
    if (dto.tipo !== undefined) updateData.tipo = dto.tipo;
    if (dto.descripcion !== undefined) updateData.descripcion = dto.descripcion;
    if (dto.id_sucursal !== undefined) updateData.id_sucursal = dto.id_sucursal;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('bodega')
        .update(updateData)
        .eq('id_bodega', id_bodega);

      if (error) throw new AppError('Error al actualizar la bodega', 500);
    }

    const actualizada = await this.obtenerPorId(id_bodega);
    if (!actualizada) throw new AppError('Error al recuperar la bodega actualizada', 500);
    return actualizada;
  }

  async desactivar(id_bodega: number): Promise<BodegaItem> {
    const actual = await this.obtenerPorId(id_bodega);
    if (!actual) throw new AppError('Bodega no encontrada', 404);

    const { error } = await supabase
      .from('bodega')
      .update({ activo: false })
      .eq('id_bodega', id_bodega);

    if (error) throw new AppError('Error al desactivar la bodega', 500);

    const desactivada = await this.obtenerPorId(id_bodega);
    if (!desactivada) throw new AppError('Error al recuperar la bodega desactivada', 500);
    return desactivada;
  }

  async activar(id_bodega: number): Promise<BodegaItem> {
    const actual = await this.obtenerPorId(id_bodega);
    if (!actual) throw new AppError('Bodega no encontrada', 404);

    const { error } = await supabase
      .from('bodega')
      .update({ activo: true })
      .eq('id_bodega', id_bodega);

    if (error) throw new AppError('Error al activar la bodega', 500);

    const activada = await this.obtenerPorId(id_bodega);
    if (!activada) throw new AppError('Error al recuperar la bodega activada', 500);
    return activada;
  }

  async verificarStock(id_bodega: number): Promise<StockBodegaResult> {
    const { data, error } = await supabase
      .from('inventario')
      .select('id_inventario')
      .eq('id_bodega', id_bodega)
      .eq('activo', true)
      .gt('stock_actual', 0)
      .limit(1);

    if (error) {
      throw new AppError('Error al verificar stock de la bodega', 500);
    }

    return { tiene_stock: (data ?? []).length > 0 };
  }

  private async existeNombreEnSucursal(nombre: string, id_sucursal: number, excluirId?: number): Promise<boolean> {
    let query = supabase
      .from('bodega')
      .select('id_bodega')
      .ilike('nombre', nombre)
      .eq('id_sucursal', id_sucursal);

    if (excluirId !== undefined) {
      query = query.neq('id_bodega', excluirId);
    }

    const { data, error } = await query;
    if (error) {
      throw new AppError('Error al validar nombre de la bodega', 500);
    }
    return (data ?? []).length > 0;
  }
}
