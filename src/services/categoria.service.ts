import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import type {
  CategoriaItem,
  CrearCategoriaDto,
  ActualizarCategoriaDto,
  ProductosActivosCategoria,
} from '../domain/interfaces/categoria.interface';

export class CategoriaService {

  private async contarSucursales(id_categoria: number): Promise<number> {
    const { data, error } = await supabase
      .from('sucursal_producto')
      .select('id_sucursal, producto!inner(id_categoria, activo)')
      .eq('producto.id_categoria', id_categoria)
      .eq('producto.activo', true)
      .eq('activo', true);

    if (error) return 0;

    const sucursalesUnicas = new Set((data ?? []).map((r: any) => r.id_sucursal));
    return sucursalesUnicas.size;
  }

  async listar(): Promise<CategoriaItem[]> {
    const { data, error } = await supabase
      .from('categoria')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) throw new AppError('Error al listar categorías', 500);

    const rows = data ?? [];
    const resultado: CategoriaItem[] = await Promise.all(
      rows.map(async (r: any) => ({
        id_categoria: r.id_categoria,
        nombre: r.nombre,
        activo: r.activo,
        creado_en: r.creado_en,
        cantidad_sucursales: await this.contarSucursales(r.id_categoria),
      }))
    );

    return resultado;
  }

  async crear(dto: CrearCategoriaDto): Promise<CategoriaItem> {
    // Validar nombre único (case insensitive)
    const { data: existente } = await supabase
      .from('categoria')
      .select('id_categoria')
      .ilike('nombre', dto.nombre)
      .maybeSingle();

    if (existente) throw new AppError('Ya existe una categoría con ese nombre', 409);

    const { data, error } = await supabase
      .from('categoria')
      .insert({ nombre: dto.nombre, activo: true })
      .select()
      .single();

    if (error || !data) throw new AppError('Error al crear la categoría', 500);

    return {
      id_categoria: data.id_categoria,
      nombre: data.nombre,
      activo: data.activo,
      creado_en: data.creado_en,
      cantidad_sucursales: 0,
    };
  }

  async actualizar(id_categoria: number, dto: ActualizarCategoriaDto): Promise<CategoriaItem> {
    const { data: actual } = await supabase
      .from('categoria')
      .select('id_categoria')
      .eq('id_categoria', id_categoria)
      .maybeSingle();

    if (!actual) throw new AppError('Categoría no encontrada', 404);

    if (dto.nombre) {
      const { data: duplicado } = await supabase
        .from('categoria')
        .select('id_categoria')
        .ilike('nombre', dto.nombre)
        .neq('id_categoria', id_categoria)
        .maybeSingle();

      if (duplicado) throw new AppError('Ya existe una categoría con ese nombre', 409);
    }

    const { data, error } = await supabase
      .from('categoria')
      .update({ ...(dto.nombre && { nombre: dto.nombre }) })
      .eq('id_categoria', id_categoria)
      .select()
      .single();

    if (error || !data) throw new AppError('Error al actualizar la categoría', 500);

    return {
      id_categoria: data.id_categoria,
      nombre: data.nombre,
      activo: data.activo,
      creado_en: data.creado_en,
      cantidad_sucursales: await this.contarSucursales(id_categoria),
    };
  }

  async verificarProductosActivos(id_categoria: number): Promise<ProductosActivosCategoria> {
    const { count, error } = await supabase
      .from('producto')
      .select('id_producto', { count: 'exact', head: true })
      .eq('id_categoria', id_categoria)
      .eq('activo', true);

    if (error) throw new AppError('Error al verificar productos', 500);

    return { cantidad: count ?? 0 };
  }

  async desactivar(id_categoria: number): Promise<CategoriaItem> {
    const { data, error } = await supabase
      .from('categoria')
      .update({ activo: false })
      .eq('id_categoria', id_categoria)
      .select()
      .single();

    if (error || !data) throw new AppError('Error al desactivar la categoría', 500);

    return {
      id_categoria: data.id_categoria,
      nombre: data.nombre,
      activo: data.activo,
      creado_en: data.creado_en,
      cantidad_sucursales: await this.contarSucursales(id_categoria),
    };
  }

  async activar(id_categoria: number): Promise<CategoriaItem> {
    const { data, error } = await supabase
      .from('categoria')
      .update({ activo: true })
      .eq('id_categoria', id_categoria)
      .select()
      .single();

    if (error || !data) throw new AppError('Error al activar la categoría', 500);

    return {
      id_categoria: data.id_categoria,
      nombre: data.nombre,
      activo: data.activo,
      creado_en: data.creado_en,
      cantidad_sucursales: await this.contarSucursales(id_categoria),
    };
  }
}
