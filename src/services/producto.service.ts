import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import { AuditoriaService } from './auditoria.service';
import type {
  ProductoDto,
  ProductoListItem,
  CategoriaDto,
  ProductoSucursalItem,
  ProductoIngredienteDto,
  ProductoComboDto,
  ProductoDependenciasDesactivacionDto,
} from '../domain/interfaces/producto.interface';

export class ProductoService {
  private readonly auditoriaService = new AuditoriaService();

  private resolverActor(actor?: number | { id_usuario?: number; id_usuario_sucursal?: number }): { id_usuario?: number; id_usuario_sucursal?: number } {
    if (typeof actor === 'number') {
      return { id_usuario: actor };
    }

    return actor ?? {};
  }

  private async registrarAuditoriaProducto(
    accion: 'INSERT' | 'UPDATE' | 'DELETE',
    id_producto: number,
    id_usuario: number | undefined,
    anterior: Record<string, unknown>,
    nuevo: Record<string, unknown>
  ): Promise<void> {
    if (!id_usuario) return;

    const camposCambiados = Array.from(new Set([
      ...Object.keys(anterior ?? {}),
      ...Object.keys(nuevo ?? {}),
    ])).filter(campo => JSON.stringify((anterior as any)?.[campo]) !== JSON.stringify((nuevo as any)?.[campo]));

    if (camposCambiados.length === 0 && accion === 'UPDATE') return;

    await this.auditoriaService.registrar({
      entidad: 'producto',
      accion,
      id_entidad: id_producto,
      id_usuario,
      campos_cambiados: camposCambiados,
      valor_anterior: anterior,
      valor_nuevo: nuevo,
    });
  }

  private async registrarPrecioHistorial(
    id_producto: number,
    precio_nuevo: number,
    id_usuario_sucursal?: number,
    precio_anterior?: number
  ): Promise<void> {
    if (!id_usuario_sucursal) return;

    const payload = {
      id_producto,
      precio_anterior: precio_anterior ?? precio_nuevo,
      precio_nuevo,
      id_usuario_sucursal,
      activo: true,
    };

    const { error } = await supabase.from('producto_precio_historial').insert(payload);
    if (error) {
      throw new AppError('Error al registrar historial de precio del producto', 500);
    }
  }

  private async crearAsociacionProductoSucursal(id_producto: number, id_sucursal: number): Promise<void> {
    const { error } = await supabase
      .from('sucursal_producto')
      .insert({
        id_producto,
        id_sucursal,
        activo: true,
      });

    if (error) throw error;
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

  private async insertarProductoIngrediente(id_producto: number, ingrediente: ProductoIngredienteDto): Promise<void> {
    const { error } = await supabase.from('producto_ingrediente').insert({
      id_producto,
      id_ingrediente: ingrediente.id_ingrediente,
      cantidad: ingrediente.cantidad,
      activo: true,
    });

    if (error) throw error;
  }

  private async obtenerIngredientesProductoRaw(id_producto: number): Promise<any[]> {
    const { data, error } = await supabase
      .from('producto_ingrediente')
      .select('id_ingrediente, cantidad, activo, ingrediente:ingrediente!inner(id_ingrediente, nombre, unidad_medida, activo)')
      .eq('id_producto', id_producto);

    if (error) throw error;
    return data ?? [];
  }

  private async sincronizarIngredientesProducto(id_producto: number, ingredientes: ProductoIngredienteDto[]): Promise<void> {
    const ingredientesNormalizados = ingredientes.map(item => ({
      id_ingrediente: item.id_ingrediente,
      cantidad: item.cantidad,
    }));

    const idsIngredientes = Array.from(new Set(ingredientesNormalizados.map(item => item.id_ingrediente)));
    if (idsIngredientes.length > 0) {
      const { data: ingredientesValidos, error: ingredientesError } = await supabase
        .from('ingrediente')
        .select('id_ingrediente')
        .in('id_ingrediente', idsIngredientes)
        .eq('activo', true);

      if (ingredientesError) throw new AppError('Error al validar ingredientes del producto', 500);

      const encontrados = new Set((ingredientesValidos ?? []).map((item: any) => Number(item.id_ingrediente)));
      const faltante = idsIngredientes.find(id => !encontrados.has(id));
      if (faltante) throw new AppError(`Ingrediente invalido o inactivo: ${faltante}`, 400);
    }

    const { error: deleteError } = await supabase
      .from('producto_ingrediente')
      .delete()
      .eq('id_producto', id_producto);

    if (deleteError) throw new AppError('Error al actualizar ingredientes del producto', 500);

    for (const ingrediente of ingredientesNormalizados) {
      try {
        await this.insertarProductoIngrediente(id_producto, ingrediente);
      } catch {
        throw new AppError('Error al actualizar ingredientes del producto', 500);
      }
    }
  }

  private async insertarProductoCombo(id_producto: number, componente: ProductoComboDto): Promise<void> {
    const { error } = await supabase.from('producto_combo').insert({
      id_producto_padre: id_producto,
      id_producto_hijo: componente.id_producto_hijo,
      cantidad: componente.cantidad,
      activo: true,
    });

    if (error) throw error;
  }

  private async obtenerComponentesComboRaw(id_producto: number): Promise<any[]> {
    const { data, error } = await supabase
      .from('producto_combo')
      .select('id_producto_hijo, cantidad, activo, producto:producto!id_producto_hijo(id_producto, nombre, activo)')
      .eq('id_producto_padre', id_producto);

    if (error) throw error;
    return data ?? [];
  }

  private async sincronizarComponentesCombo(id_producto: number, productos_combo: ProductoComboDto[]): Promise<void> {
    const componentes = productos_combo.map(item => ({
      id_producto_hijo: item.id_producto_hijo,
      cantidad: item.cantidad,
    }));

    const idsHijos = Array.from(new Set(componentes.map(item => item.id_producto_hijo)));
    if (idsHijos.some(id => id === id_producto)) {
      throw new AppError('Un combo no puede incluirse a si mismo como componente', 400);
    }

    if (idsHijos.length > 0) {
      const { data: productosValidos, error: productosError } = await supabase
        .from('producto')
        .select('id_producto')
        .in('id_producto', idsHijos)
        .eq('activo', true);

      if (productosError) throw new AppError('Error al validar productos del combo', 500);

      const encontrados = new Set((productosValidos ?? []).map((item: any) => Number(item.id_producto)));
      const faltante = idsHijos.find(id => !encontrados.has(id));
      if (faltante) throw new AppError(`Producto hijo invalido o inactivo: ${faltante}`, 400);
    }

    const { error: deleteError } = await supabase
      .from('producto_combo')
      .delete()
      .eq('id_producto_padre', id_producto);

    if (deleteError) {
      throw new AppError('Error al actualizar componentes del combo', 500);
    }

    for (const componente of componentes) {
      try {
        await this.insertarProductoCombo(id_producto, componente);
      } catch {
        throw new AppError('Error al actualizar componentes del combo', 500);
      }
    }
  }

  async productoPerteneceASucursal(id_producto: number, id_sucursal: number): Promise<boolean> {
    const { data, error } = await supabase
      .from('sucursal_producto')
      .select('id_producto')
      .eq('id_producto', id_producto)
      .eq('id_sucursal', id_sucursal)
      .eq('activo', true)
      .maybeSingle();

    if (error) throw new AppError('Error al validar sucursal del producto', 500);
    return !!data;
  }

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
      .select('id_producto, nombre, descripcion, precio, activo, id_categoria, categoria!inner(nombre)')
      .eq('activo', true);

    if (productIds) {
      query = query.in('id_producto', productIds);
    }

    const { data, error } = await query;
    if (error) throw new AppError('Error al listar productos', 500);

    const productos = data ?? [];
    const idsProducto = productos.map((item: any) => item.id_producto);
    const sucursalesPorProducto = new Map<number, number[]>();
    const combosMap = new Map<number, boolean>();

    if (idsProducto.length > 0) {
      const { data: sucursalProductoData } = await supabase
        .from('sucursal_producto')
        .select('id_producto, id_sucursal, activo')
        .in('id_producto', idsProducto);

      for (const row of (sucursalProductoData ?? []) as any[]) {
        if (row.activo === false) continue;
        const actual = sucursalesPorProducto.get(row.id_producto) ?? [];
        if (!actual.includes(row.id_sucursal)) {
          actual.push(row.id_sucursal);
          sucursalesPorProducto.set(row.id_producto, actual);
        }
      }

      for (const idProducto of idsProducto) {
        try {
          const componentes = await this.obtenerComponentesComboRaw(idProducto);
          const tieneActivos = (componentes ?? []).some((row: any) => row.activo ?? true);
          combosMap.set(idProducto, tieneActivos);
        } catch {
          combosMap.set(idProducto, false);
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
      es_combo: combosMap.get(item.id_producto) ?? false,
    }));
  }

  async obtenerProductoPorId(id_producto: number): Promise<ProductoDto | null> {
    const { data, error } = await supabase
      .from('producto')
      .select('*')
      .eq('id_producto', id_producto)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new AppError('Error al obtener producto', 500);
    }

    return data;
  }

  async crearProducto(dto: ProductoDto, actor?: number | { id_usuario?: number; id_usuario_sucursal?: number }): Promise<ProductoDto> {
    const actorInfo = this.resolverActor(actor);
    const { id_sucursal, ids_sucursales, ingredientes, productos_combo, ...productoPayload } = dto;
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

    if (error) throw new AppError('Error al crear producto', 500);

    try {
      for (const sucursalId of sucursalesDestino) {
        await this.crearAsociacionProductoSucursal(data.id_producto, sucursalId);
      }

      if (ingredientes !== undefined) {
        await this.sincronizarIngredientesProducto(data.id_producto, ingredientes);
      }

      if (productos_combo !== undefined) {
        await this.sincronizarComponentesCombo(data.id_producto, productos_combo);
      }
    } catch {
      await supabase.from('sucursal_producto').delete().eq('id_producto', data.id_producto);
      await supabase.from('producto_ingrediente').delete().eq('id_producto', data.id_producto);
      await supabase.from('producto_combo').delete().eq('id_producto_padre', data.id_producto);
      await supabase.from('producto').delete().eq('id_producto', data.id_producto);
      throw new AppError('Error al asociar producto con sucursal', 500);
    }

    await this.registrarPrecioHistorial(
      data.id_producto,
      Number(data.precio),
      actorInfo.id_usuario_sucursal,
      Number(data.precio)
    );
    await this.registrarAuditoriaProducto('INSERT', data.id_producto, actorInfo.id_usuario, {}, data as Record<string, unknown>);

    return data;
  }

  async actualizarProducto(
    id_producto: number,
    dto: Partial<ProductoDto>,
    actor?: number | { id_usuario?: number; id_usuario_sucursal?: number }
  ): Promise<ProductoDto> {
    const actorInfo = this.resolverActor(actor);
    let actual: ProductoDto | null = null;
    try {
      actual = await this.obtenerProductoPorId(id_producto);
    } catch {
      actual = null;
    }

    const { ids_sucursales, id_sucursal, ingredientes, productos_combo, ...payload } = dto;

    const { data, error } = await supabase
      .from('producto')
      .update(payload)
      .eq('id_producto', id_producto)
      .select()
      .single();

    if (error) throw new AppError('Error al actualizar producto', 500);

    if (ids_sucursales !== undefined) {
      await this.sincronizarSucursalesProducto(id_producto, ids_sucursales);
    } else if (typeof id_sucursal === 'number') {
      await this.sincronizarSucursalesProducto(id_producto, [id_sucursal]);
    }

    if (ingredientes !== undefined) {
      await this.sincronizarIngredientesProducto(id_producto, ingredientes);
    }

    if (productos_combo !== undefined) {
      await this.sincronizarComponentesCombo(id_producto, productos_combo);
    }

    if (dto.precio !== undefined && Number(dto.precio) !== Number(actual?.precio)) {
      await this.registrarPrecioHistorial(
        id_producto,
        Number(dto.precio),
        actorInfo.id_usuario_sucursal,
        Number(actual?.precio ?? dto.precio)
      );
    }

    await this.registrarAuditoriaProducto(
      'UPDATE',
      id_producto,
      actorInfo.id_usuario,
      (actual ?? {}) as unknown as Record<string, unknown>,
      { ...(actual ?? {}), ...data, ...dto } as Record<string, unknown>
    );

    return data;
  }

  async obtenerSucursalesDeProducto(id_producto: number): Promise<ProductoSucursalItem[]> {
    const { data, error } = await supabase
      .from('sucursal_producto')
      .select('id_sucursal, activo')
      .eq('id_producto', id_producto);

    if (error) throw new AppError('Error al obtener sucursales del producto', 500);

    return (data ?? [])
      .filter((row: any) => row.activo ?? true)
      .map((row: any) => ({
        id_sucursal: row.id_sucursal,
        activo: row.activo ?? true,
      }));
  }

  async obtenerIngredientesDeProducto(id_producto: number): Promise<ProductoIngredienteDto[]> {
    try {
      const data = await this.obtenerIngredientesProductoRaw(id_producto);
      return (data ?? [])
        .filter((row: any) => row.activo ?? true)
        .map((row: any) => {
          const ingredienteInfoRaw = row.ingrediente;
          const ingredienteInfo = Array.isArray(ingredienteInfoRaw) ? ingredienteInfoRaw[0] : ingredienteInfoRaw;
          const cantidad = Number(row.cantidad ?? 0);

          return {
            id_ingrediente: Number(row.id_ingrediente),
            cantidad,
            activo: row.activo ?? true,
            nombre_ingrediente: ingredienteInfo?.nombre,
            unidad_medida: ingredienteInfo?.unidad_medida,
          };
        })
        .filter(item => item.activo && item.cantidad > 0);
    } catch {
      throw new AppError('Error al obtener ingredientes del producto', 500);
    }
  }

  async obtenerComponentesCombo(id_producto: number): Promise<ProductoComboDto[]> {
    try {
      const data = await this.obtenerComponentesComboRaw(id_producto);
      return (data ?? [])
        .filter((row: any) => row.activo ?? true)
        .map((row: any) => {
          const productoInfoRaw = row.producto;
          const productoInfo = Array.isArray(productoInfoRaw) ? productoInfoRaw[0] : productoInfoRaw;
          return {
            id_producto_hijo: Number(row.id_producto_hijo),
            cantidad: Number(row.cantidad ?? 0),
            activo: row.activo ?? true,
            nombre_producto: productoInfo?.nombre,
          };
        })
        .filter(item => item.activo && item.cantidad > 0);
    } catch {
      throw new AppError('Error al obtener componentes del combo', 500);
    }
  }

  async verificarDependenciasDesactivacion(id_producto: number): Promise<ProductoDependenciasDesactivacionDto> {
    const { data, error } = await supabase
      .from('pedido_producto')
      .select('id_pedido_producto, estado_linea, pedido:pedido!id_pedido(estado_operativo)')
      .eq('id_producto', id_producto);

    if (error) throw new AppError('Error al verificar dependencias de desactivacion', 500);

    const activos = (data ?? []).filter((row: any) => {
      const estadoLinea = String(row.estado_linea ?? '').toUpperCase();
      if (estadoLinea === 'CANCELADO') return false;

      const pedidoRaw = row.pedido;
      const pedido = Array.isArray(pedidoRaw) ? pedidoRaw[0] : pedidoRaw;
      const estadoPedido = String(pedido?.estado_operativo ?? '').toUpperCase();

      if (!estadoPedido) return true;
      return !['CANCELADO', 'CERRADO', 'FINALIZADO', 'PAGADO'].includes(estadoPedido);
    });

    const total = activos.length;
    return {
      id_producto,
      tiene_pedidos_activos: total > 0,
      total_pedidos_activos: total,
      ...(total > 0 && {
        mensaje_advertencia: `El producto tiene ${total} pedido(s) activo(s). Si lo desactivas, no aparecera para nuevos pedidos.`,
      }),
    };
  }

  async eliminarProducto(id_producto: number, opts?: { id_usuario?: number; forzar?: boolean }): Promise<void> {
    if (!opts) {
      const { error } = await supabase
        .from('producto')
        .update({ activo: false })
        .eq('id_producto', id_producto);

      if (error) throw new AppError('Error al eliminar producto', 500);
      return;
    }

    const actual = await this.obtenerProductoPorId(id_producto);
    if (!actual) throw new AppError('Producto no encontrado', 404);

    if (!opts?.forzar) {
      const deps = await this.verificarDependenciasDesactivacion(id_producto);
      if (deps.tiene_pedidos_activos) {
        throw new AppError(deps.mensaje_advertencia ?? 'El producto tiene pedidos activos', 409);
      }
    }

    const { error } = await supabase
      .from('producto')
      .update({ activo: false })
      .eq('id_producto', id_producto);

    if (error) throw new AppError('Error al eliminar producto', 500);

    await this.registrarAuditoriaProducto(
      'DELETE',
      id_producto,
      opts?.id_usuario,
      { activo: actual.activo },
      { activo: false }
    );
  }

  async listarCategorias(id_sucursal?: number): Promise<CategoriaDto[]> {
    const { data, error } = await supabase
      .from('categoria')
      .select('*')
      .eq('activo', true);

    if (error) throw new AppError('Error al listar categorías', 500);
    return data ?? [];
  }

  async crearCategoria(dto: CategoriaDto): Promise<CategoriaDto> {
    const { data, error } = await supabase
      .from('categoria')
      .insert(dto)
      .select()
      .single();

    if (error) throw new AppError('Error al crear categoría', 500);
    return data;
  }
}
