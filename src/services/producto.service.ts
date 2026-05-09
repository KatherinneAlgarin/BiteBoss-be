import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import type { ProductoDto, ProductoListItem, CategoriaDto } from '../domain/interfaces/producto.interface';

export class ProductoService {

  async listarProductos(id_sucursal?: number): Promise<ProductoListItem[]> {
    let productIds: number[] | undefined;

    if (id_sucursal) {
      const { data: spData, error: spError } = await supabase
        .from('sucursal_producto')
        .select('id_producto')
        .eq('id_sucursal', id_sucursal)
        .eq('activo', true);

      if (spError) throw new AppError('Error al listar productos', 500);

      productIds = (spData ?? []).map((sp: any) => sp.id_producto);
      if (productIds.length === 0) return [];
    }

    let query = supabase
      .from('producto')
      .select(`
        id_producto,
        nombre,
        descripcion,
        precio,
        activo,
        id_categoria,
        categoria!inner (
          nombre
        )
      `)
      .eq('activo', true);

    if (productIds) {
      query = query.in('id_producto', productIds);
    }

    const { data, error } = await query;

    if (error) throw new AppError('Error al listar productos', 500);

    return (data ?? []).map(item => ({
      id_producto: item.id_producto,
      nombre: item.nombre,
      precio: item.precio,
      descripcion: item.descripcion,
      id_categoria: item.id_categoria,
      categoria_nombre: (item.categoria as any)?.nombre,
      activo: item.activo,
    }));
  }

  async obtenerProductoPorId(id_producto: number): Promise<ProductoDto | null> {
    const { data, error } = await supabase
      .from('producto')
      .select('*')
      .eq('id_producto', id_producto)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No encontrado
      }
      throw new AppError('Error al obtener producto', 500);
    }

    return data;
  }

  async crearProducto(dto: ProductoDto): Promise<ProductoDto> {
    const { data, error } = await supabase
      .from('producto')
      .insert(dto)
      .select()
      .single();

    if (error) {
      throw new AppError('Error al crear producto', 500);
    }

    return data;
  }

  async actualizarProducto(id_producto: number, dto: Partial<ProductoDto>): Promise<ProductoDto> {
    const { data, error } = await supabase
      .from('producto')
      .update(dto)
      .eq('id_producto', id_producto)
      .select()
      .single();

    if (error) {
      throw new AppError('Error al actualizar producto', 500);
    }

    return data;
  }

  async eliminarProducto(id_producto: number): Promise<void> {
    const { error } = await supabase
      .from('producto')
      .update({ activo: false })
      .eq('id_producto', id_producto);

    if (error) {
      throw new AppError('Error al eliminar producto', 500);
    }
  }

  async listarCategorias(id_sucursal?: number): Promise<CategoriaDto[]> {
    let query = supabase
      .from('categoria')
      .select('*')
      .eq('activo', true);

    if (id_sucursal) {
      query = query.eq('id_sucursal', id_sucursal);
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError('Error al listar categorías', 500);
    }

    return data ?? [];
  }

  async crearCategoria(dto: CategoriaDto): Promise<CategoriaDto> {
    const { data, error } = await supabase
      .from('categoria')
      .insert(dto)
      .select()
      .single();

    if (error) {
      throw new AppError('Error al crear categoría', 500);
    }

    return data;
  }
}