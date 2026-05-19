import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import type {
  IngredienteItem,
  CrearIngredienteDto,
  ActualizarIngredienteDto,
  StockInicialDto,
  EnUsoIngrediente,
} from '../domain/interfaces/ingrediente.interface';

export class IngredienteService {

  async listar(): Promise<IngredienteItem[]> {
    const { data, error } = await supabase
      .from('ingrediente')
      .select('id_ingrediente, nombre, unidad_medida, activo')
      .order('nombre', { ascending: true });

    if (error) throw new AppError('Error al listar ingredientes', 500);

    return (data ?? []).map((i: any) => ({
      id_ingrediente: i.id_ingrediente,
      nombre: i.nombre,
      unidad_medida: i.unidad_medida,
      activo: i.activo ?? true,
    }));
  }

  async obtenerPorId(id_ingrediente: number): Promise<IngredienteItem | null> {
    const { data, error } = await supabase
      .from('ingrediente')
      .select('id_ingrediente, nombre, unidad_medida, activo')
      .eq('id_ingrediente', id_ingrediente)
      .maybeSingle();

    if (error) throw new AppError('Error al obtener ingrediente', 500);
    if (!data) return null;

    return {
      id_ingrediente: data.id_ingrediente,
      nombre: data.nombre,
      unidad_medida: data.unidad_medida,
      activo: data.activo ?? true,
    };
  }

  async crear(dto: CrearIngredienteDto, id_usuario: number): Promise<IngredienteItem> {
    if (await this.existeNombre(dto.nombre)) {
      throw new AppError('Ya existe un ingrediente con ese nombre', 409);
    }

    const { data, error } = await supabase
      .from('ingrediente')
      .insert({ nombre: dto.nombre, unidad_medida: dto.unidad_medida, activo: true })
      .select('id_ingrediente')
      .single();

    if (error || !data) throw new AppError('Error al crear el ingrediente', 500);

    if (dto.stock_inicial) {
      await this.crearStockInicial(data.id_ingrediente, dto.stock_inicial, id_usuario);
    }

    const ingrediente = await this.obtenerPorId(data.id_ingrediente);
    if (!ingrediente) throw new AppError('Error al recuperar el ingrediente creado', 500);
    return ingrediente;
  }

  async actualizar(id_ingrediente: number, dto: ActualizarIngredienteDto): Promise<IngredienteItem> {
    const actual = await this.obtenerPorId(id_ingrediente);
    if (!actual) throw new AppError('Ingrediente no encontrado', 404);

    if (dto.nombre !== undefined && await this.existeNombre(dto.nombre, id_ingrediente)) {
      throw new AppError('Ya existe un ingrediente con ese nombre', 409);
    }

    const updateData: Record<string, any> = {};
    if (dto.nombre !== undefined) updateData.nombre = dto.nombre;
    if (dto.unidad_medida !== undefined) updateData.unidad_medida = dto.unidad_medida;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('ingrediente')
        .update(updateData)
        .eq('id_ingrediente', id_ingrediente);

      if (error) throw new AppError('Error al actualizar el ingrediente', 500);
    }

    const actualizado = await this.obtenerPorId(id_ingrediente);
    if (!actualizado) throw new AppError('Error al recuperar el ingrediente actualizado', 500);
    return actualizado;
  }

  async desactivar(id_ingrediente: number): Promise<IngredienteItem> {
    const actual = await this.obtenerPorId(id_ingrediente);
    if (!actual) throw new AppError('Ingrediente no encontrado', 404);

    const { error } = await supabase
      .from('ingrediente')
      .update({ activo: false })
      .eq('id_ingrediente', id_ingrediente);

    if (error) throw new AppError('Error al desactivar el ingrediente', 500);

    const desactivado = await this.obtenerPorId(id_ingrediente);
    if (!desactivado) throw new AppError('Error al recuperar el ingrediente desactivado', 500);
    return desactivado;
  }

  async activar(id_ingrediente: number): Promise<IngredienteItem> {
    const actual = await this.obtenerPorId(id_ingrediente);
    if (!actual) throw new AppError('Ingrediente no encontrado', 404);

    const { error } = await supabase
      .from('ingrediente')
      .update({ activo: true })
      .eq('id_ingrediente', id_ingrediente);

    if (error) throw new AppError('Error al activar el ingrediente', 500);

    const activado = await this.obtenerPorId(id_ingrediente);
    if (!activado) throw new AppError('Error al recuperar el ingrediente activado', 500);
    return activado;
  }

  async verificarEnUso(id_ingrediente: number): Promise<EnUsoIngrediente> {
    const { data, error } = await supabase
      .from('producto_ingrediente')
      .select('producto:producto!id_producto(nombre, activo)')
      .eq('id_ingrediente', id_ingrediente)
      .eq('activo', true);

    if (error) throw new AppError('Error al verificar uso del ingrediente', 500);

    const productosActivos = (data ?? [])
      .map((row: any) => row.producto)
      .filter((p: any) => p?.activo === true)
      .map((p: any) => p.nombre as string);

    return { en_uso: productosActivos.length > 0, productos: productosActivos };
  }

  private async crearStockInicial(id_ingrediente: number, stock: StockInicialDto, id_usuario: number): Promise<void> {
    const { data: inventario, error: errorInv } = await supabase
      .from('inventario')
      .insert({
        id_ingrediente,
        id_bodega: stock.id_bodega,
        stock_actual: stock.cantidad,
        stock_minimo: stock.stock_minimo,
        stock_maximo: stock.stock_maximo,
        activo: true,
        id_usuario,
      })
      .select('id_inventario')
      .single();

    if (errorInv || !inventario) {
      throw new AppError('Error al registrar stock inicial del ingrediente', 500);
    }

    const { error: errorMov } = await supabase
      .from('movimiento_inventario')
      .insert({
        id_inventario: inventario.id_inventario,
        id_usuario,
        tipo: 'AJUSTE_POSITIVO',
        cantidad: stock.cantidad,
        stock_anterior: 0,
        stock_nuevo: stock.cantidad,
      });

    if (errorMov) {
      throw new AppError('Error al registrar movimiento de stock inicial', 500);
    }
  }

  private async existeNombre(nombre: string, excluirId?: number): Promise<boolean> {
    let query = supabase
      .from('ingrediente')
      .select('id_ingrediente')
      .ilike('nombre', nombre);

    if (excluirId !== undefined) {
      query = query.neq('id_ingrediente', excluirId);
    }

    const { data, error } = await query;
    if (error) throw new AppError('Error al validar nombre del ingrediente', 500);
    return (data ?? []).length > 0;
  }
}
