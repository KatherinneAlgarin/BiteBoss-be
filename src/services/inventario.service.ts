import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import type {
  InventarioStockActualItem,
  InventarioIngredienteItem,
  InventarioMovimientoItem,
  ListarMovimientosInventarioDto,
  RegistrarStockIngredienteDto,
  AjusteStockDto,
  DescartarInventarioDto,
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

  private normalizeRole(role: string | undefined): string {
    return (role ?? '').trim().toUpperCase();
  }

  private isMissingColumnError(error: unknown, columnName: string): boolean {
    const message = String((error as any)?.message ?? '').toLowerCase();
    return message.includes(columnName.toLowerCase()) && (
      message.includes('column') || message.includes('schema') || message.includes('pgrst204')
    );
  }

  private extractNotaFromRow(row: Record<string, unknown>): string {
    const candidates = [
      row.nota,
      row.observacion,
      row.comentario,
      row.motivo,
      row.descripcion,
      row.detalle,
    ];

    const found = candidates.find(value => typeof value === 'string' && value.trim().length > 0);
    return typeof found === 'string' ? found : '';
  }

  private async insertarMovimientoConNotaCompat(payload: {
    tipo: 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO';
    id_inventario: number;
    id_usuario: number;
    cantidad: number;
    stock_anterior: number;
    stock_nuevo: number;
    nota: string;
  }): Promise<void> {
    const basePayload = {
      tipo: payload.tipo,
      id_inventario: payload.id_inventario,
      id_usuario: payload.id_usuario,
      cantidad: payload.cantidad,
      stock_anterior: payload.stock_anterior,
      stock_nuevo: payload.stock_nuevo,
    };

    const noteColumns = ['nota', 'observacion', 'comentario', 'motivo', 'descripcion', 'detalle'];

    for (const noteColumn of noteColumns) {
      const payloadWithNote = { ...basePayload, [noteColumn]: payload.nota } as Record<string, unknown>;
      const { error } = await supabase.from('movimiento_inventario').insert(payloadWithNote);

      if (!error) return;

      if (!this.isMissingColumnError(error, noteColumn)) {
        throw new AppError('Error al registrar movimiento de ajuste', 500);
      }
    }

    // Fallback 2: registrar movimiento sin nota para no bloquear operación.
    // La nota se deja en log estructurado si la tabla no soporta ese campo.
    const { error: fallbackError } = await supabase
      .from('movimiento_inventario')
      .insert(basePayload);

    if (fallbackError) {
      throw new AppError('Error al registrar movimiento de ajuste', 500);
    }

    console.warn('[inventario][ajuste] movimiento sin columna de nota en BD', {
      id_inventario: payload.id_inventario,
      id_usuario: payload.id_usuario,
      tipo: payload.tipo,
      nota: payload.nota,
    });
  }

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
      .eq('activo', true)
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

  async listarMovimientos(
    dto: ListarMovimientosInventarioDto,
    actor: { rol: string; id_sucursal?: number }
  ): Promise<InventarioMovimientoItem[]> {
    const role = this.normalizeRole(actor.rol);

    if (role !== 'ADMIN') {
      if (!actor.id_sucursal || actor.id_sucursal !== dto.id_sucursal) {
        throw new AppError('Solo puedes consultar movimientos de tu sucursal', 403);
      }
    }

    const { data: bodegas, error: bodegasError } = await supabase
      .from('bodega')
      .select('id_bodega, nombre')
      .eq('id_sucursal', dto.id_sucursal)
      .eq('activo', true);

    if (bodegasError) throw new AppError('Error al consultar bodegas de la sucursal', 500);

    const bodegaIds = (bodegas ?? []).map((b: any) => Number(b.id_bodega));
    if (bodegaIds.length === 0) return [];

    const bodegaMap = new Map<number, string>();
    for (const b of (bodegas ?? []) as any[]) {
      bodegaMap.set(Number(b.id_bodega), b.nombre ?? '');
    }

    const { data: inventarioRows, error: inventarioError } = await supabase
      .from('inventario')
      .select('id_inventario, id_ingrediente, id_bodega')
      .in('id_bodega', bodegaIds);

    if (inventarioError) throw new AppError('Error al consultar inventario de la sucursal', 500);

    const inventarioMap = new Map<number, { id_ingrediente: number | null; id_bodega: number }>();
    for (const row of (inventarioRows ?? []) as any[]) {
      inventarioMap.set(Number(row.id_inventario), {
        id_ingrediente: row.id_ingrediente === null ? null : Number(row.id_ingrediente),
        id_bodega: Number(row.id_bodega),
      });
    }

    const inventarioIds = Array.from(inventarioMap.keys());
    if (inventarioIds.length === 0) return [];

    let movimientosQuery = supabase
      .from('movimiento_inventario')
      .select('*')
      .in('id_inventario', inventarioIds)
      .limit(dto.limit ?? 200);

    if (dto.id_usuario) movimientosQuery = movimientosQuery.eq('id_usuario', dto.id_usuario);

    const { data: movimientosData, error: movimientosError } = await movimientosQuery;
    if (movimientosError) throw new AppError('Error al consultar movimientos de inventario', 500);

    const rows = (movimientosData ?? []) as any[];
    if (rows.length === 0) return [];

    const ingredienteIds = [...new Set(
      rows
        .map(row => inventarioMap.get(Number(row.id_inventario))?.id_ingrediente)
        .filter((id): id is number => typeof id === 'number')
    )];

    const usuarioIds = [...new Set(
      rows
        .map(row => row.id_usuario)
        .filter((id): id is number => typeof id === 'number')
    )];

    const ingMap = new Map<number, string>();
    if (ingredienteIds.length > 0) {
      const { data: ingredientesData, error: ingredientesError } = await supabase
        .from('ingrediente')
        .select('id_ingrediente, nombre')
        .in('id_ingrediente', ingredienteIds);

      if (ingredientesError) throw new AppError('Error al consultar ingredientes de movimientos', 500);

      for (const ing of (ingredientesData ?? []) as any[]) {
        ingMap.set(Number(ing.id_ingrediente), ing.nombre ?? '');
      }
    }

    const userMap = new Map<number, string>();
    if (usuarioIds.length > 0) {
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('usuario')
        .select('id_usuario, nombre')
        .in('id_usuario', usuarioIds);

      if (usuariosError) throw new AppError('Error al consultar usuarios de movimientos', 500);

      for (const user of (usuariosData ?? []) as any[]) {
        userMap.set(Number(user.id_usuario), user.nombre ?? '');
      }
    }

    const desdeDate = dto.desde ? new Date(`${dto.desde}T00:00:00`) : null;
    const hastaDate = dto.hasta ? new Date(`${dto.hasta}T23:59:59`) : null;

    const movimientos = rows
      .map(row => {
        const idInventario = Number(row.id_inventario);
        const inv = inventarioMap.get(idInventario);
        if (!inv) return null;

        const idIngrediente = inv.id_ingrediente;
        const idBodega = inv.id_bodega;
        const fechaRaw = row.created_at ?? row.creado_en ?? row.fecha ?? null;
        const parsedFecha = fechaRaw ? new Date(String(fechaRaw)) : null;
        const tipoNormalizado = row.tipo === 'AJUSTE_NEGATIVO'
          ? 'AJUSTE_NEGATIVO'
          : row.tipo === 'ENTRADA_COMPRA'
            ? 'ENTRADA_COMPRA'
            : 'AJUSTE_POSITIVO';

        return {
          id_movimiento: Number(row.id_movimiento_inventario ?? row.id_movimiento ?? row.id ?? 0),
          fecha: fechaRaw ? String(fechaRaw) : null,
          tipo: tipoNormalizado,
          id_inventario: idInventario,
          id_ingrediente: idIngrediente,
          nombre_ingrediente: idIngrediente ? (ingMap.get(idIngrediente) ?? 'Ingrediente') : 'Ingrediente',
          id_bodega: idBodega,
          nombre_bodega: bodegaMap.get(idBodega) ?? 'Bodega',
          id_usuario: row.id_usuario === null ? null : Number(row.id_usuario),
          nombre_usuario: row.id_usuario ? (userMap.get(Number(row.id_usuario)) ?? 'Usuario') : 'Sistema',
          cantidad: Number(row.cantidad ?? 0),
          stock_anterior: Number(row.stock_anterior ?? 0),
          stock_nuevo: Number(row.stock_nuevo ?? 0),
          nota: this.extractNotaFromRow(row),
          _parsed_fecha: parsedFecha,
        } as InventarioMovimientoItem;
      })
      .filter((row): row is InventarioMovimientoItem => row !== null)
      .filter(row => {
        const fecha = (row as any)._parsed_fecha as Date | null;
        if (desdeDate && fecha && fecha < desdeDate) return false;
        if (hastaDate && fecha && fecha > hastaDate) return false;
        if ((desdeDate || hastaDate) && !fecha) return false;
        return true;
      })
      .filter(row => !dto.id_ingrediente || row.id_ingrediente === dto.id_ingrediente)
      .filter(row => !dto.id_bodega || row.id_bodega === dto.id_bodega)
      .sort((a, b) => {
        const aTime = (a as any)._parsed_fecha instanceof Date ? (a as any)._parsed_fecha.getTime() : 0;
        const bTime = (b as any)._parsed_fecha instanceof Date ? (b as any)._parsed_fecha.getTime() : 0;
        return bTime - aTime;
      })
      .map(row => {
        const { _parsed_fecha, ...safeRow } = row as InventarioMovimientoItem & { _parsed_fecha?: Date | null };
        return safeRow;
      });

    return movimientos;
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
      .eq('activo', true)
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

  async ajustarStock(
    id_inventario: number,
    dto: AjusteStockDto,
    actor: { id_usuario: number; rol: string; id_sucursal?: number }
  ): Promise<void> {
    const { data: inv } = await supabase
      .from('inventario')
      .select('id_inventario, id_bodega, stock_actual, stock_minimo, bodega(id_sucursal, nombre)')
      .eq('id_inventario', id_inventario)
      .maybeSingle();

    if (!inv) throw new AppError('Registro de inventario no encontrado', 404);

    const role = this.normalizeRole(actor.rol);
    const bodegaInfoRaw = (inv as any).bodega;
    const bodegaInfo = Array.isArray(bodegaInfoRaw) ? bodegaInfoRaw[0] : bodegaInfoRaw;
    const idSucursalInventario = Number(bodegaInfo?.id_sucursal);
    if (role !== 'ADMIN') {
      if (!actor.id_sucursal || !Number.isFinite(idSucursalInventario)) {
        throw new AppError('No se pudo validar la sucursal del ajuste', 400);
      }
      if (Number(actor.id_sucursal) !== idSucursalInventario) {
        throw new AppError('Solo puedes ajustar stock de tu sucursal', 403);
      }
    }

    const stockAnterior = Number(inv.stock_actual);
    const stockNuevo = Number(dto.nueva_cantidad);
    const diferencia = stockNuevo - stockAnterior;

    if (diferencia === 0) {
      throw new AppError('La nueva cantidad debe ser diferente al stock actual', 400);
    }

    if (stockNuevo < 0) throw new AppError('El ajuste resultaría en stock negativo', 400);

    const { error: updateError } = await supabase
      .from('inventario')
      .update({ stock_actual: stockNuevo })
      .eq('id_inventario', id_inventario);

    if (updateError) throw new AppError('Error al ajustar stock', 500);

    const tipoMovimiento = diferencia > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO';
    const cantidadMovimiento = Math.abs(diferencia);

    await this.insertarMovimientoConNotaCompat({
      tipo: tipoMovimiento,
      id_inventario,
      id_usuario: actor.id_usuario,
      cantidad: cantidadMovimiento,
      stock_anterior: stockAnterior,
      stock_nuevo: stockNuevo,
      nota: dto.nota,
    });

    const enAlerta = stockNuevo < Number(inv.stock_minimo ?? 0);
    if (enAlerta) {
      console.warn('[inventario][ajuste] Stock en alerta tras ajuste manual', {
        id_inventario,
        id_bodega: inv.id_bodega,
        id_usuario: actor.id_usuario,
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
        stock_minimo: Number(inv.stock_minimo ?? 0),
      });
    }
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

  async descartarStockIngrediente(
    id_inventario: number,
    dto: DescartarInventarioDto,
    actor: { id_usuario: number; rol: string; id_sucursal?: number }
  ): Promise<void> {
    const { data: inv } = await supabase
      .from('inventario')
      .select('id_inventario, id_bodega, stock_actual, activo, bodega(id_sucursal)')
      .eq('id_inventario', id_inventario)
      .maybeSingle();

    if (!inv) throw new AppError('Registro de inventario no encontrado', 404);
    if ((inv as any).activo === false) throw new AppError('El registro ya fue descartado', 409);

    const role = this.normalizeRole(actor.rol);
    const bodegaInfoRaw = (inv as any).bodega;
    const bodegaInfo = Array.isArray(bodegaInfoRaw) ? bodegaInfoRaw[0] : bodegaInfoRaw;
    const idSucursalInventario = Number(bodegaInfo?.id_sucursal);

    if (role !== 'ADMIN') {
      if (!actor.id_sucursal || !Number.isFinite(idSucursalInventario)) {
        throw new AppError('No se pudo validar la sucursal del descarte', 400);
      }
      if (Number(actor.id_sucursal) !== idSucursalInventario) {
        throw new AppError('Solo puedes descartar stock de tu sucursal', 403);
      }
    }

    const stockAnterior = Number((inv as any).stock_actual ?? 0);

    const { error: updateError } = await supabase
      .from('inventario')
      .update({ activo: false, stock_actual: 0 })
      .eq('id_inventario', id_inventario);

    if (updateError) throw new AppError('Error al descartar registro de inventario', 500);

    if (stockAnterior > 0) {
      await this.insertarMovimientoConNotaCompat({
        tipo: 'AJUSTE_NEGATIVO',
        id_inventario,
        id_usuario: actor.id_usuario,
        cantidad: stockAnterior,
        stock_anterior: stockAnterior,
        stock_nuevo: 0,
        nota: `Descarte de registro: ${dto.nota}`,
      });
    }
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
