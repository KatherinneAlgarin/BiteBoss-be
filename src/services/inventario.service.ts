import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import type { InventarioStockActualItem } from '../domain/interfaces/inventario.interface';

type InventarioProductoRow = {
  id_producto: number | null;
  stock_actual: number;
  stock_minimo: number;
  producto: Array<{
    id_producto: number;
    nombre: string;
    activo: boolean;
  }>;
};

export class InventarioService {

  async listarStockActualProductos(id_sucursal?: number): Promise<InventarioStockActualItem[]> {
    if (!id_sucursal) {
      throw new AppError('No se pudo determinar la sucursal del usuario', 400);
    }

    const { data: bodegas, error: bodegasError } = await supabase
      .from('bodega')
      .select('id_bodega')
      .eq('id_sucursal', id_sucursal)
      .eq('activo', true);

    if (bodegasError) {
      throw new AppError('Error al consultar bodegas de la sucursal', 500);
    }

    const bodegaIds = (bodegas ?? []).map((bodega: any) => bodega.id_bodega);
    if (bodegaIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('inventario')
      .select(`
        id_producto,
        stock_actual,
        stock_minimo,
        producto:producto!inner (
          id_producto,
          nombre,
          activo
        )
      `)
      .in('id_bodega', bodegaIds)
      .eq('activo', true)
      .not('id_producto', 'is', null);

    if (error) {
      throw new AppError('Error al consultar inventario actual', 500);
    }

    const acumuladoPorProducto = new Map<number, InventarioStockActualItem>();

    for (const row of (data ?? []) as InventarioProductoRow[]) {
      const producto = row.producto?.[0];
      const idProducto = row.id_producto;

      if (!producto || !producto.activo || idProducto === null) {
        continue;
      }

      const stockActual = Number(row.stock_actual ?? 0);
      const stockMinimo = Number(row.stock_minimo ?? 0);
      const existente = acumuladoPorProducto.get(idProducto);

      if (existente) {
        existente.stock_actual += stockActual;
        existente.stock_minimo += stockMinimo;
        existente.en_alerta = existente.stock_actual < existente.stock_minimo;
        continue;
      }

      acumuladoPorProducto.set(idProducto, {
        id_producto: idProducto,
        nombre_producto: producto.nombre,
        stock_actual: stockActual,
        unidad_medida: 'unidad',
        stock_minimo: stockMinimo,
        en_alerta: stockActual < stockMinimo,
      });
    }

    return Array.from(acumuladoPorProducto.values()).sort((a, b) =>
      a.nombre_producto.localeCompare(b.nombre_producto)
    );
  }
}
