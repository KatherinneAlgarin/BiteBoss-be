import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import type {
  ZonaItem,
  CrearZonaDto,
  ActualizarZonaDto,
} from '../domain/interfaces/zona.interface';

export class ZonaService {

  async listarPorSucursal(id_sucursal: number): Promise<ZonaItem[]> {
    const { data, error } = await supabase
      .from('zona')
      .select('id_zona, id_sucursal, nombre, descripcion, activo')
      .eq('id_sucursal', id_sucursal)
      .order('nombre', { ascending: true });

    if (error) {
      throw new AppError('Error al listar zonas', 500);
    }

    return (data ?? []).map((z: any) => ({
      id_zona: z.id_zona,
      id_sucursal: z.id_sucursal,
      nombre: z.nombre,
      descripcion: z.descripcion ?? null,
      activo: z.activo ?? true,
    }));
  }

  async obtenerPorId(id_zona: number): Promise<ZonaItem | null> {
    const { data, error } = await supabase
      .from('zona')
      .select('id_zona, id_sucursal, nombre, descripcion, activo')
      .eq('id_zona', id_zona)
      .maybeSingle();

    if (error) {
      throw new AppError('Error al obtener zona', 500);
    }
    if (!data) return null;

    return {
      id_zona: data.id_zona,
      id_sucursal: data.id_sucursal,
      nombre: data.nombre,
      descripcion: data.descripcion ?? null,
      activo: data.activo ?? true,
    };
  }

  async crear(dto: CrearZonaDto): Promise<ZonaItem> {
    if (await this.existeSucursal(dto.id_sucursal) === false) {
      throw new AppError('La sucursal indicada no existe', 400);
    }

    if (await this.existeNombreEnSucursal(dto.nombre, dto.id_sucursal)) {
      throw new AppError('Ya existe una zona con ese nombre en esta sucursal', 409);
    }

    const { data, error } = await supabase
      .from('zona')
      .insert({
        id_sucursal: dto.id_sucursal,
        nombre: dto.nombre,
        descripcion: dto.descripcion ?? null,
        activo: true,
      })
      .select('id_zona, id_sucursal, nombre, descripcion, activo')
      .single();

    if (error || !data) {
      throw new AppError('Error al crear la zona', 500);
    }

    return {
      id_zona: data.id_zona,
      id_sucursal: data.id_sucursal,
      nombre: data.nombre,
      descripcion: data.descripcion ?? null,
      activo: data.activo ?? true,
    };
  }

  async actualizar(id_zona: number, dto: ActualizarZonaDto): Promise<ZonaItem> {
    const actual = await this.obtenerPorId(id_zona);
    if (!actual) {
      throw new AppError('Zona no encontrada', 404);
    }

    if (dto.nombre !== undefined && dto.nombre !== actual.nombre) {
      if (await this.existeNombreEnSucursal(dto.nombre, actual.id_sucursal, id_zona)) {
        throw new AppError('Ya existe una zona con ese nombre en esta sucursal', 409);
      }
    }

    const updateData: Record<string, any> = {};
    if (dto.nombre !== undefined) updateData.nombre = dto.nombre;
    if (dto.descripcion !== undefined) updateData.descripcion = dto.descripcion;

    if (Object.keys(updateData).length === 0) {
      return actual;
    }

    const { error } = await supabase
      .from('zona')
      .update(updateData)
      .eq('id_zona', id_zona);

    if (error) {
      throw new AppError('Error al actualizar la zona', 500);
    }

    const actualizada = await this.obtenerPorId(id_zona);
    if (!actualizada) {
      throw new AppError('Error al recuperar la zona actualizada', 500);
    }
    return actualizada;
  }

  async desactivar(id_zona: number): Promise<ZonaItem> {
    if (await this.tieneInformacionActivaAsociada(id_zona)) {
      throw new AppError(
        'No se puede desactivar: la zona tiene información activa asociada.',
        409,
      );
    }

    const { data, error } = await supabase
      .from('zona')
      .update({ activo: false })
      .eq('id_zona', id_zona)
      .select('id_zona, id_sucursal, nombre, descripcion, activo')
      .single();

    if (error || !data) {
      throw new AppError('Error al desactivar la zona', 500);
    }

    return {
      id_zona: data.id_zona,
      id_sucursal: data.id_sucursal,
      nombre: data.nombre,
      descripcion: data.descripcion ?? null,
      activo: data.activo ?? false,
    };
  }

  async activar(id_zona: number): Promise<ZonaItem> {
    const { data, error } = await supabase
      .from('zona')
      .update({ activo: true })
      .eq('id_zona', id_zona)
      .select('id_zona, id_sucursal, nombre, descripcion, activo')
      .single();

    if (error || !data) {
      throw new AppError('Error al activar la zona', 500);
    }

    return {
      id_zona: data.id_zona,
      id_sucursal: data.id_sucursal,
      nombre: data.nombre,
      descripcion: data.descripcion ?? null,
      activo: data.activo ?? true,
    };
  }

  private async existeSucursal(id_sucursal: number): Promise<boolean> {
    const { data, error } = await supabase
      .from('sucursal')
      .select('id_sucursal')
      .eq('id_sucursal', id_sucursal)
      .maybeSingle();

    if (error) {
      throw new AppError('Error al validar la sucursal', 500);
    }
    return !!data;
  }

  private async existeNombreEnSucursal(nombre: string, id_sucursal: number, excluirIdZona?: number): Promise<boolean> {
    let query = supabase
      .from('zona')
      .select('id_zona')
      .eq('id_sucursal', id_sucursal)
      .ilike('nombre', nombre);

    if (excluirIdZona !== undefined) {
      query = query.neq('id_zona', excluirIdZona);
    }

    const { data, error } = await query;
    if (error) {
      throw new AppError('Error al validar nombre de la zona', 500);
    }
    return (data ?? []).length > 0;
  }

  private async tieneInformacionActivaAsociada(id_zona: number): Promise<boolean> {
    const { data, error } = await supabase
      .from('mesa')
      .select('id_mesa')
      .eq('id_zona', id_zona)
      .eq('activo', true)
      .limit(1);

    if (error) {
      // si la tabla mesa aún no existe en BD, no bloquear (devolver false)
      return false;
    }

    return (data ?? []).length > 0;
  }
}
