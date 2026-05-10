import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import type {
  MesaItem,
  CrearMesaDto,
  ActualizarMesaDto,
} from '../domain/interfaces/mesa.interface';

export class MesaService {

  async listarPorZona(id_zona: number): Promise<MesaItem[]> {
    const { data, error } = await supabase
      .from('mesa')
      .select('id_mesa, id_zona, numero, capacidad, activo')
      .eq('id_zona', id_zona)
      .order('numero', { ascending: true });

    if (error) {
      throw new AppError('Error al listar mesas', 500);
    }

    return (data ?? []).map((m: any) => ({
      id_mesa: m.id_mesa,
      id_zona: m.id_zona,
      numero: m.numero,
      capacidad: m.capacidad,
      activo: m.activo ?? true,
    }));
  }

  async obtenerPorId(id_mesa: number): Promise<MesaItem | null> {
    const { data, error } = await supabase
      .from('mesa')
      .select('id_mesa, id_zona, numero, capacidad, activo')
      .eq('id_mesa', id_mesa)
      .maybeSingle();

    if (error) {
      throw new AppError('Error al obtener mesa', 500);
    }
    if (!data) return null;

    return {
      id_mesa: data.id_mesa,
      id_zona: data.id_zona,
      numero: data.numero,
      capacidad: data.capacidad,
      activo: data.activo ?? true,
    };
  }

  async crear(dto: CrearMesaDto): Promise<MesaItem> {
    if (!(await this.existeZona(dto.id_zona))) {
      throw new AppError('La zona indicada no existe', 400);
    }

    if (await this.existeNumeroEnZona(dto.numero, dto.id_zona)) {
      throw new AppError('Ya existe una mesa con ese número en esta zona', 409);
    }

    const { data, error } = await supabase
      .from('mesa')
      .insert({
        id_zona: dto.id_zona,
        numero: dto.numero,
        capacidad: dto.capacidad,
        activo: true,
      })
      .select('id_mesa, id_zona, numero, capacidad, activo')
      .single();

    if (error || !data) {
      throw new AppError('Error al crear la mesa', 500);
    }

    return {
      id_mesa: data.id_mesa,
      id_zona: data.id_zona,
      numero: data.numero,
      capacidad: data.capacidad,
      activo: data.activo ?? true,
    };
  }

  async actualizar(id_mesa: number, dto: ActualizarMesaDto): Promise<MesaItem> {
    const actual = await this.obtenerPorId(id_mesa);
    if (!actual) {
      throw new AppError('Mesa no encontrada', 404);
    }

    const zonaDestino = dto.id_zona ?? actual.id_zona;
    const numeroDestino = dto.numero ?? actual.numero;

    if (dto.id_zona !== undefined && dto.id_zona !== actual.id_zona) {
      if (!(await this.existeZona(dto.id_zona))) {
        throw new AppError('La zona indicada no existe', 400);
      }
    }

    const cambioRelevante = dto.numero !== undefined || (dto.id_zona !== undefined && dto.id_zona !== actual.id_zona);
    if (cambioRelevante) {
      if (await this.existeNumeroEnZona(numeroDestino, zonaDestino, id_mesa)) {
        throw new AppError('Ya existe una mesa con ese número en la zona destino', 409);
      }
    }

    const updateData: Record<string, any> = {};
    if (dto.id_zona !== undefined) updateData.id_zona = dto.id_zona;
    if (dto.numero !== undefined) updateData.numero = dto.numero;
    if (dto.capacidad !== undefined) updateData.capacidad = dto.capacidad;

    if (Object.keys(updateData).length === 0) {
      return actual;
    }

    const { error } = await supabase
      .from('mesa')
      .update(updateData)
      .eq('id_mesa', id_mesa);

    if (error) {
      throw new AppError('Error al actualizar la mesa', 500);
    }

    const actualizada = await this.obtenerPorId(id_mesa);
    if (!actualizada) {
      throw new AppError('Error al recuperar la mesa actualizada', 500);
    }
    return actualizada;
  }

  async desactivar(id_mesa: number): Promise<MesaItem> {
    const { data, error } = await supabase
      .from('mesa')
      .update({ activo: false })
      .eq('id_mesa', id_mesa)
      .select('id_mesa, id_zona, numero, capacidad, activo')
      .single();

    if (error || !data) {
      throw new AppError('Error al desactivar la mesa', 500);
    }

    return {
      id_mesa: data.id_mesa,
      id_zona: data.id_zona,
      numero: data.numero,
      capacidad: data.capacidad,
      activo: data.activo ?? false,
    };
  }

  async activar(id_mesa: number): Promise<MesaItem> {
    const { data, error } = await supabase
      .from('mesa')
      .update({ activo: true })
      .eq('id_mesa', id_mesa)
      .select('id_mesa, id_zona, numero, capacidad, activo')
      .single();

    if (error || !data) {
      throw new AppError('Error al activar la mesa', 500);
    }

    return {
      id_mesa: data.id_mesa,
      id_zona: data.id_zona,
      numero: data.numero,
      capacidad: data.capacidad,
      activo: data.activo ?? true,
    };
  }

  private async existeZona(id_zona: number): Promise<boolean> {
    const { data, error } = await supabase
      .from('zona')
      .select('id_zona')
      .eq('id_zona', id_zona)
      .maybeSingle();

    if (error) {
      throw new AppError('Error al validar la zona', 500);
    }
    return !!data;
  }

  private async existeNumeroEnZona(numero: number, id_zona: number, excluirIdMesa?: number): Promise<boolean> {
    let query = supabase
      .from('mesa')
      .select('id_mesa')
      .eq('id_zona', id_zona)
      .eq('numero', numero);

    if (excluirIdMesa !== undefined) {
      query = query.neq('id_mesa', excluirIdMesa);
    }

    const { data, error } = await query;
    if (error) {
      throw new AppError('Error al validar número de mesa', 500);
    }
    return (data ?? []).length > 0;
  }
}
