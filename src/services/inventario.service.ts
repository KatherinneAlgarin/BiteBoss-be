import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import type {
  InventarioStockActualItem,
  InventarioIngredienteItem,
  RegistrarStockIngredienteDto,
  AjusteStockDto,
  ActualizarLimitesDto,
  TransferirStockDto,
} from '../domain/interfaces/inventario.interface';

type InventarioProductoRow = {
  id_producto: number | null;
  stock_actual: number;
  stock_minimo: number;
  producto: Array<{ id_producto: number; nombre: string; activo: boolean }>;
};

export class InventarioService {

  async listarStockActualProductos(id_sucursal?: number): Promise<InventarioStockActualItem[]> {
    if (!id_sucursal) throw new AppError('No se pudo determinar la sucursal del usuario', 400);

    const { data: bodegas, error: bodegasError } = await supabase
      .from('bodega')
      .select('id_bodega')
      .eq('id_sucursal', id_sucursal)
      .eq('activo', true);

    if (bodegasError) throw new AppError('Error al consultar bodegas de la sucursal', 500);

    const bodegaIds = (bodegas ?? []).map((b: any) => b.id_bodega);
    if (bodegaIds.length === 0) return [];

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

    if (error) throw new AppError('Error al consultar inventario actual', 500);

    const acumulado = new Map<number, InventarioStockActualItem>();

    for (const row of (data ?? []) as InventarioProductoRow[]) {
      const producto = row.producto?.[0];
      const idProducto = row.id_producto;
      if (!producto || !producto.activo || idProducto === null) continue;

      const stockActual = Number(row.stock_actual ?? 0);
      const stockMinimo = Number(row.stock_minimo ?? 0);
      const existente = acumulado.get(idProducto);

      if (existente) {
        existente.stock_actual += stockActual;
        existente.stock_minimo += stockMinimo;
        existente.en_alerta = existente.stock_actual < existente.stock_minimo;
        continue;
      }

      acumulado.set(idProducto, {
        id_producto: idProducto,
        nombre_producto: producto.nombre,
        stock_actual: stockActual,
        unidad_medida: 'unidad',
        stock_minimo: stockMinimo,
        en_alerta: stockActual < stockMinimo,
      });
    }

    return Array.from(acumulado.values()).sort((a, b) =>
      a.nombre_producto.localeCompare(b.nombre_producto)
    );
  }

  async listarStockActualIngredientes(id_sucursal?: number): Promise<InventarioIngredienteItem[]> {
    if (!id_sucursal) throw new AppError('No se pudo determinar la sucursal del usuario', 400);

    const { data: bodegas, error: bodegasError } = await supabase
      .from('bodega')
      .select('id_bodega, nombre')
      .eq('id_sucursal', id_sucursal)
      .eq('activo', true);

    if (bodegasError) throw new AppError('Error al consultar bodegas de la sucursal', 500);

    const bodegaIds = (bodegas ?? []).map((b: any) => b.id_bodega);
    if (bodegaIds.length === 0) return [];

    const bodegaMap = new Map<number, string>();
    for (const b of (bodegas ?? []) as any[]) {
      bodegaMap.set(b.id_bodega, b.nombre);
    }

    const { data: invData, error: invError } = await supabase
      .from('inventario')
      .select('id_inventario, id_ingrediente, id_bodega, stock_actual, stock_minimo, stock_maximo, lote, fecha_vencimiento')
      .in('id_bodega', bodegaIds)
      .not('id_ingrediente', 'is', null);

    if (invError) throw new AppError('Error al consultar inventario de ingredientes', 500);

    const rows = (invData ?? []) as Array<{
      id_inventario: number;
      id_ingrediente: number;
      id_bodega: number;
      stock_actual: number;
      stock_minimo: number;
      stock_maximo: number;
      lote: string | null;
      fecha_vencimiento: string | null;
    }>;

    if (rows.length === 0) return [];

    const ingredienteIds = [...new Set(rows.map(r => r.id_ingrediente))];

    const { data: ingData, error: ingError } = await supabase
      .from('ingrediente')
      .select('id_ingrediente, nombre, unidad_medida, activo')
      .in('id_ingrediente', ingredienteIds)
      .eq('activo', true);

    if (ingError) throw new AppError('Error al consultar ingredientes', 500);

    const ingMap = new Map<number, { nombre: string; unidad_medida: string }>();
    for (const ing of (ingData ?? []) as any[]) {
      ingMap.set(ing.id_ingrediente, { nombre: ing.nombre, unidad_medida: ing.unidad_medida });
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const en7Dias = new Date(hoy);
    en7Dias.setDate(en7Dias.getDate() + 7);

    const result: InventarioIngredienteItem[] = [];

    for (const row of rows) {
      const ing = ingMap.get(row.id_ingrediente);
      if (!ing) continue;

      const stockActual = Number(row.stock_actual ?? 0);
      const stockMinimo = Number(row.stock_minimo ?? 0);
      const stockMaximo = Number(row.stock_maximo ?? 0);

      let proxima_vencer = false;
      let vencido = false;

      if (row.fecha_vencimiento) {
        const fv = new Date(row.fecha_vencimiento);
        fv.setHours(0, 0, 0, 0);
        vencido = fv < hoy;
        proxima_vencer = !vencido && fv <= en7Dias;
      }

      result.push({
        id_inventario: row.id_inventario,
        id_ingrediente: row.id_ingrediente,
        nombre_ingrediente: ing.nombre,
        unidad_medida: ing.unidad_medida,
        id_bodega: row.id_bodega,
        nombre_bodega: bodegaMap.get(row.id_bodega) ?? '',
        stock_actual: stockActual,
        stock_minimo: stockMinimo,
        stock_maximo: stockMaximo,
        lote: row.lote ?? null,
        fecha_vencimiento: row.fecha_vencimiento ?? null,
        en_alerta: stockActual < stockMinimo,
        proxima_vencer,
        vencido,
      });
    }

    return result.sort((a, b) => a.nombre_ingrediente.localeCompare(b.nombre_ingrediente));
  }

  async registrarStockIngrediente(dto: RegistrarStockIngredienteDto, id_usuario: number): Promise<void> {
    const { data: ingrediente } = await supabase
      .from('ingrediente')
      .select('id_ingrediente')
      .eq('id_ingrediente', dto.id_ingrediente)
      .eq('activo', true)
      .maybeSingle();

    if (!ingrediente) throw new AppError('Ingrediente no encontrado o inactivo', 404);

    const { data: bodega } = await supabase
      .from('bodega')
      .select('id_bodega')
      .eq('id_bodega', dto.id_bodega)
      .eq('activo', true)
      .maybeSingle();

    if (!bodega) throw new AppError('Bodega no encontrada o inactiva', 404);

    const { data: existente } = await supabase
      .from('inventario')
      .select('id_inventario')
      .eq('id_ingrediente', dto.id_ingrediente)
      .eq('id_bodega', dto.id_bodega)
      .maybeSingle();

    if (existente) throw new AppError('Ya existe un registro de stock para este ingrediente en esta bodega', 409);

    const { data: nuevoInv, error: invError } = await supabase
      .from('inventario')
      .insert({
        id_ingrediente: dto.id_ingrediente,
        id_bodega: dto.id_bodega,
        stock_actual: dto.cantidad,
        stock_minimo: dto.stock_minimo,
        stock_maximo: dto.stock_maximo,
        lote: dto.lote ?? null,
        fecha_vencimiento: dto.fecha_vencimiento ?? null,
        activo: true,
        id_usuario,
      })
      .select('id_inventario')
      .single();

    if (invError || !nuevoInv) throw new AppError('Error al registrar stock', 500);

    await supabase.from('movimiento_inventario').insert({
      tipo: 'AJUSTE_POSITIVO',
      id_inventario: nuevoInv.id_inventario,
      id_usuario,
      cantidad: dto.cantidad,
      stock_anterior: 0,
      stock_nuevo: dto.cantidad,
    });
  }

  async ajustarStock(id_inventario: number, dto: AjusteStockDto, id_usuario: number): Promise<void> {
    const { data: inv } = await supabase
      .from('inventario')
      .select('id_inventario, stock_actual')
      .eq('id_inventario', id_inventario)
      .maybeSingle();

    if (!inv) throw new AppError('Registro de inventario no encontrado', 404);

    const stockAnterior = Number(inv.stock_actual);
    const stockNuevo = dto.tipo === 'AJUSTE_POSITIVO'
      ? stockAnterior + dto.cantidad
      : stockAnterior - dto.cantidad;

    if (stockNuevo < 0) throw new AppError('El ajuste resultaría en stock negativo', 400);

    const updateData: Record<string, any> = { stock_actual: stockNuevo };
    if (dto.tipo === 'AJUSTE_POSITIVO') {
      if (dto.lote !== undefined) updateData.lote = dto.lote || null;
      if (dto.fecha_vencimiento !== undefined) updateData.fecha_vencimiento = dto.fecha_vencimiento || null;
    }

    const { error: updateError } = await supabase
      .from('inventario')
      .update(updateData)
      .eq('id_inventario', id_inventario);

    if (updateError) throw new AppError('Error al ajustar stock', 500);

    await supabase.from('movimiento_inventario').insert({
      tipo: dto.tipo,
      id_inventario,
      id_usuario,
      cantidad: dto.cantidad,
      stock_anterior: stockAnterior,
      stock_nuevo: stockNuevo,
    });
  }

  async actualizarLimites(id_inventario: number, dto: ActualizarLimitesDto): Promise<void> {
    const { data: inv } = await supabase
      .from('inventario')
      .select('id_inventario')
      .eq('id_inventario', id_inventario)
      .maybeSingle();

    if (!inv) throw new AppError('Registro de inventario no encontrado', 404);

    const { error } = await supabase
      .from('inventario')
      .update({ stock_minimo: dto.stock_minimo, stock_maximo: dto.stock_maximo })
      .eq('id_inventario', id_inventario);

    if (error) throw new AppError('Error al actualizar límites', 500);
  }

  async transferirStock(id_inventario: number, dto: TransferirStockDto, id_usuario: number): Promise<void> {
    const { data: origen } = await supabase
      .from('inventario')
      .select('id_inventario, id_ingrediente, id_bodega, stock_actual, stock_minimo, stock_maximo, lote, fecha_vencimiento')
      .eq('id_inventario', id_inventario)
      .maybeSingle();

    if (!origen) throw new AppError('Registro de inventario no encontrado', 404);
    if (Number(origen.stock_actual) < dto.cantidad) throw new AppError('Stock insuficiente para la transferencia', 400);
    if (origen.id_bodega === dto.id_bodega_destino) throw new AppError('La bodega destino debe ser diferente a la bodega origen', 400);

    const { data: bodegaDestino } = await supabase
      .from('bodega')
      .select('id_bodega')
      .eq('id_bodega', dto.id_bodega_destino)
      .eq('activo', true)
      .maybeSingle();

    if (!bodegaDestino) throw new AppError('Bodega destino no encontrada o inactiva', 404);

    const stockOrigenAnterior = Number(origen.stock_actual);
    const stockOrigenNuevo = stockOrigenAnterior - dto.cantidad;

    // Restar del origen
    await supabase.from('inventario').update({ stock_actual: stockOrigenNuevo }).eq('id_inventario', id_inventario);
    await supabase.from('movimiento_inventario').insert({
      tipo: 'AJUSTE_NEGATIVO',
      id_inventario,
      id_usuario,
      cantidad: dto.cantidad,
      stock_anterior: stockOrigenAnterior,
      stock_nuevo: stockOrigenNuevo,
    });

    // Verificar si ya existe registro del ingrediente en la bodega destino
    const { data: destExistente } = await supabase
      .from('inventario')
      .select('id_inventario, stock_actual')
      .eq('id_ingrediente', origen.id_ingrediente)
      .eq('id_bodega', dto.id_bodega_destino)
      .maybeSingle();

    if (destExistente) {
      const stockDestinoAnterior = Number(destExistente.stock_actual);
      const stockDestinoNuevo = stockDestinoAnterior + dto.cantidad;
      await supabase.from('inventario').update({ stock_actual: stockDestinoNuevo }).eq('id_inventario', destExistente.id_inventario);
      await supabase.from('movimiento_inventario').insert({
        tipo: 'AJUSTE_POSITIVO',
        id_inventario: destExistente.id_inventario,
        id_usuario,
        cantidad: dto.cantidad,
        stock_anterior: stockDestinoAnterior,
        stock_nuevo: stockDestinoNuevo,
      });
    } else {
      const { data: nuevoInv } = await supabase
        .from('inventario')
        .insert({
          id_ingrediente: origen.id_ingrediente,
          id_bodega: dto.id_bodega_destino,
          stock_actual: dto.cantidad,
          stock_minimo: origen.stock_minimo,
          stock_maximo: origen.stock_maximo,
          lote: origen.lote,
          fecha_vencimiento: origen.fecha_vencimiento,
          activo: true,
          id_usuario,
        })
        .select('id_inventario')
        .single();

      if (nuevoInv) {
        await supabase.from('movimiento_inventario').insert({
          tipo: 'AJUSTE_POSITIVO',
          id_inventario: nuevoInv.id_inventario,
          id_usuario,
          cantidad: dto.cantidad,
          stock_anterior: 0,
          stock_nuevo: dto.cantidad,
        });
      }
    }
  }
}
