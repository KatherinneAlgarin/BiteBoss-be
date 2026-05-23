import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import type { ProductoDto, ProductoListItem, CategoriaDto, ProductoSucursalItem } from '../domain/interfaces/producto.interface';

export class ProductoService {

  private isMissingColumnError(error: any): boolean {
    const code = String(error?.code ?? '').toUpperCase();
    const message = String(error?.message ?? '').toLowerCase();
    return code === 'PGRST204' || message.includes('column') && message.includes('does not exist');
  }

  private async crearAsociacionProductoSucursal(id_producto: number, id_sucursal: number): Promise<void> {
    const { error } = await supabase
      .from('sucursal_producto')
      .insert({
        id_producto,
        id_sucursal,
        activo: true,
      });

    if (!error) return;

    // Compatibilidad: algunos esquemas antiguos no tienen la columna activo en sucursal_producto.
    if (this.isMissingColumnError(error)) {
      const { error: fallbackError } = await supabase
        .from('sucursal_producto')
        .insert({
          id_producto,
          id_sucursal,
        });

      if (!fallbackError) return;
      throw fallbackError;
    }

    throw error;
  }

  private async sincronizarSucursalesProducto(id_producto: number, ids_sucursales: number[]): Promise<void> {
    const idsObjetivo = Array.from(new Set(ids_sucursales));
    if (idsObjetivo.length === 0) {
      throw new AppError('Debe indicar al menos una sucursal para asociar el producto', 400);
    }

    const { error: deleteError } = await supabase
      .from('sucursal_producto')
      .delete()
      .eq('id_producto', id_producto);

    if (deleteError) {
      throw new AppError('Error al actualizar asociaciones del producto con sucursales', 500);
    }

    for (const idSucursal of idsObjetivo) {
      try {
        await this.crearAsociacionProductoSucursal(id_producto, idSucursal);
      } catch {
        throw new AppError('Error al actualizar asociaciones del producto con sucursales', 500);
      }
    }
  }

  async listarProductos(id_sucursal?: number): Promise<ProductoListItem[]> {
    let productIds: number[] | undefined;

    // Require sucursal_producto junction table to filter products by sucursal.
    // This table must exist in the database with columns: id_producto, id_sucursal, activo
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

    const productos = data ?? [];
    const idsProducto = productos.map((item: any) => item.id_producto);
    const sucursalesPorProducto = new Map<number, number[]>();

    if (idsProducto.length > 0) {
      const { data: sucursalProductoData, error: sucursalProductoError } = await supabase
        .from('sucursal_producto')
        .select('id_producto, id_sucursal, activo')
        .in('id_producto', idsProducto);

      if (!sucursalProductoError) {
        for (const row of (sucursalProductoData ?? []) as any[]) {
          if (row.activo === false) continue;
          const actual = sucursalesPorProducto.get(row.id_producto) ?? [];
          if (!actual.includes(row.id_sucursal)) {
            actual.push(row.id_sucursal);
            sucursalesPorProducto.set(row.id_producto, actual);
          }
        }
      }
    }

    return productos.map(item => ({
      id_producto: item.id_producto,
      nombre: item.nombre,
      precio: item.precio,
      descripcion: item.descripcion,
      id_categoria: item.id_categoria,
      categoria_nombre: (item.categoria as any)?.nombre,
      activo: item.activo,
      ids_sucursales: sucursalesPorProducto.get(item.id_producto) ?? [],
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
    const { id_sucursal, ids_sucursales, ...productoPayload } = dto;
    const sucursalesDestino = Array.isArray(ids_sucursales) && ids_sucursales.length > 0
      ? ids_sucursales
      : (typeof id_sucursal === 'number' ? [id_sucursal] : []);

    if (sucursalesDestino.length === 0) {
      throw new AppError('Debe indicar al menos una sucursal para asociar el producto', 400);
    }

    const { data, error } = await supabase
      .from('producto')
      .insert(productoPayload)
      .select()
      .single();

    if (error) {
      throw new AppError('Error al crear producto', 500);
    }

    try {
      for (const sucursalId of sucursalesDestino) {
        await this.crearAsociacionProductoSucursal(data.id_producto, sucursalId);
      }
    } catch {
      // Evita productos huérfanos si falla el vínculo sucursal-producto.
      await supabase
        .from('sucursal_producto')
        .delete()
        .eq('id_producto', data.id_producto);

      await supabase
        .from('producto')
        .delete()
        .eq('id_producto', data.id_producto);
      throw new AppError('Error al asociar producto con sucursal', 500);
    }

    return data;
  }

  async actualizarProducto(id_producto: number, dto: Partial<ProductoDto>): Promise<ProductoDto> {
    const { ids_sucursales, id_sucursal, ...payload } = dto;

    const { data, error } = await supabase
      .from('producto')
      .update(payload)
      .eq('id_producto', id_producto)
      .select()
      .single();

    if (error) {
      throw new AppError('Error al actualizar producto', 500);
    }

    if (ids_sucursales !== undefined) {
      await this.sincronizarSucursalesProducto(id_producto, ids_sucursales);
    } else if (typeof id_sucursal === 'number') {
      await this.sincronizarSucursalesProducto(id_producto, [id_sucursal]);
    }

    return data;
  }

  async obtenerSucursalesDeProducto(id_producto: number): Promise<ProductoSucursalItem[]> {
    const { data, error } = await supabase
      .from('sucursal_producto')
      .select('id_sucursal, activo')
      .eq('id_producto', id_producto);

    if (error) {
      throw new AppError('Error al obtener sucursales del producto', 500);
    }

    return (data ?? [])
      .filter((row: any) => row.activo ?? true)
      .map((row: any) => ({
        id_sucursal: row.id_sucursal,
        activo: row.activo ?? true,
      }));
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
    const { data, error } = await supabase
      .from('categoria')
      .select('*')
      .eq('activo', true);

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