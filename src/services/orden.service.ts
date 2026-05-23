import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import type { OrdenDto, OrdenDetalleDto, OrdenListItem, ActualizarOrdenDto, ActualizarOrdenDetalleDto, TipoOrden, CrearOrdenDto, OrdenConDetallesDto, HistorialEstadoOrdenDto, EstadoOperativo } from '../domain/interfaces/orden.interface';

export class OrdenService {

  private readonly transicionesEstado: Record<EstadoOperativo, EstadoOperativo[]> = {
    ABIERTO: ['POR_COBRAR', 'CANCELADO'],
    POR_COBRAR: ['CERRADO', 'CANCELADO'],
    CERRADO: ['FINALIZADO'],
    CANCELADO: ['FINALIZADO'],
    FINALIZADO: [],
  };

  private validarTransicionEstado(actual: EstadoOperativo, siguiente: EstadoOperativo): void {
    if (actual === siguiente) return;

    const permitidos = this.transicionesEstado[actual] ?? [];
    if (!permitidos.includes(siguiente)) {
      throw new AppError(`Transición de estado no permitida: ${actual} -> ${siguiente}`, 409);
    }
  }

  private async registrarCambioEstado(
    id_pedido: number,
    estado_anterior: EstadoOperativo,
    estado_nuevo: EstadoOperativo,
    id_usuario?: number
  ): Promise<void> {
    if (!id_usuario) return;
    if (estado_anterior === estado_nuevo) return;

    await supabase.from('auditoria').insert({
      entidad: 'pedido',
      accion: 'UPDATE',
      id_entidad: id_pedido,
      id_usuario,
      campos_cambiados: ['estado_operativo'],
      valor_anterior: { estado_operativo: estado_anterior },
      valor_nuevo: { estado_operativo: estado_nuevo },
    });
  }

  private normalizeTipoOrden(value: string): string {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  private getTipoOrdenAliases(tipo_orden: TipoOrden): string[] {
    const normalized = this.normalizeTipoOrden(tipo_orden);
    const map: Record<string, string[]> = {
      dinein: ['dine-in', 'dine in', 'mesa', 'en local', 'consumir en el local', 'comer aqui'],
      takeout: ['takeout', 'take-out', 'para llevar', 'llevar'],
      delivery: ['delivery', 'domicilio', 'a domicilio'],
    };

    return map[normalized] ?? [tipo_orden];
  }

  async getSucursalTipoOrdenId(id_sucursal: number, tipo_orden: TipoOrden): Promise<number> {
    const aliases = this.getTipoOrdenAliases(tipo_orden).map(item => this.normalizeTipoOrden(item));

    const { data: sucursalTiposData, error: sucursalTiposError } = await supabase
      .from('sucursal_tipo_orden')
      .select('id_sucursal_tipo_orden, id_tipo_orden, tipo_orden!inner(id_tipo_orden, nombre, activo)')
      .eq('id_sucursal', id_sucursal)
      .eq('activo', true)
      .eq('tipo_orden.activo', true);

    if (sucursalTiposError || !sucursalTiposData || sucursalTiposData.length === 0) {
      throw new AppError('Tipo de orden no disponible para esta sucursal', 400);
    }

    const match = (sucursalTiposData as any[]).find((item: any) => {
      const nombre = item?.tipo_orden?.nombre;
      return aliases.includes(this.normalizeTipoOrden(nombre));
    });

    if (match?.id_sucursal_tipo_orden) {
      return match.id_sucursal_tipo_orden;
    }

    // Fallback defensivo: usa el primer tipo activo habilitado en la sucursal
    const fallback = (sucursalTiposData as any[])[0];
    if (fallback?.id_sucursal_tipo_orden) {
      return fallback.id_sucursal_tipo_orden;
    }

    throw new AppError('Tipo de orden no disponible para esta sucursal', 400);
  }

  async calcularTotales(detalles: OrdenDetalleDto[]): Promise<number> {
    return detalles.reduce((sum, d) => sum + d.subtotal, 0);
  }

  async crearOrden(dto: CrearOrdenDto, actor?: { id_usuario?: number; id_sucursal?: number }): Promise<OrdenConDetallesDto> {
    const id_usuario = actor?.id_usuario;
    const id_sucursal = dto.id_sucursal ?? actor?.id_sucursal;

    if (!id_usuario) {
      throw new AppError('Usuario no autenticado', 401);
    }

    if (!id_sucursal) {
      throw new AppError('Debe indicar una sucursal para el pedido', 400);
    }

    const id_sucursal_tipo_orden = await this.getSucursalTipoOrdenId(id_sucursal, dto.tipo_orden);
    const nombre_cliente = dto.nombre_cliente?.trim() || 'Consumidor final';
    const apellido_cliente = dto.apellido_cliente?.trim() || '';

    const { data: pedido, error } = await supabase
      .from('pedido')
      .insert({
        id_usuario,
        id_sucursal,
        id_sucursal_tipo_orden,
        total: 0,
        estado_operativo: 'ABIERTO',
        estado_financiero: 'SIN_PAGAR',
        nombre_cliente,
        apellido_cliente,
      })
      .select()
      .single();

    if (error || !pedido) {
      throw new AppError('Error al crear pedido', 500);
    }

    try {
      if (dto.id_mesa !== undefined) {
        await supabase.from('pedido_mesa').insert({
          id_pedido: pedido.id_pedido,
          id_mesa: dto.id_mesa,
        });
      }

      for (const detalle of dto.detalles) {
        await this.agregarDetalleOrden(
          pedido.id_pedido,
          detalle.id_producto,
          detalle.cantidad,
          detalle.nota,
          id_usuario
        );
      }
    } catch (creationError) {
      await supabase.from('pedido_mesa').delete().eq('id_pedido', pedido.id_pedido);
      await supabase.from('pedido_producto').delete().eq('id_pedido', pedido.id_pedido);
      await supabase.from('pedido').delete().eq('id_pedido', pedido.id_pedido);
      if (creationError instanceof AppError) {
        throw creationError;
      }
      throw new AppError('Error al crear pedido', 500);
    }

    await this.recalcularTotales(pedido.id_pedido);

    const orden = await this.obtenerOrdenPorId(pedido.id_pedido);
    const detalles = await this.obtenerDetallesOrden(pedido.id_pedido);

    if (!orden) {
      throw new AppError('Error al obtener pedido creado', 500);
    }

    return {
      ...orden,
      detalles,
    };
  }

  async listarOrdenes(id_sucursal?: number, estado?: string): Promise<OrdenListItem[]> {
    const estadoNormalizado = (estado ?? '').toUpperCase();
    const requestingFinalizado = estadoNormalizado === 'FINALIZADO';

    let query = supabase
      .from('pedido')
      .select(`
        id_pedido,
        total,
        fecha_apertura,
        fecha_cerrado,
        nombre_cliente,
        apellido_cliente,
        estado_operativo,
        id_usuario,
        id_sucursal_tipo_orden,
        sucursal_tipo_orden!inner (
          tipo_orden!inner (nombre)
        ),
        pedido_producto (
          id_producto,
          cantidad,
          nota,
          producto (nombre)
        ),
        pedido_mesa (
          mesa!inner (numero)
        )
      `)
      .order('fecha_apertura', { ascending: false });

    if (id_sucursal) {
      query = query.eq('id_sucursal', id_sucursal);
    }

    if (estado && !requestingFinalizado) {
      query = query.eq('estado_operativo', estado);
    } else {
      query = query.in('estado_operativo', ['ABIERTO', 'POR_COBRAR', 'CERRADO', 'CANCELADO']);
    }

    const primaryRes = await query;
    let data: any[] | null = primaryRes.data as any[] | null;
    let error: any = primaryRes.error;

    const missingFechaCerrado = error && (
      error.code === '42703' ||
      String(error.message ?? '').toLowerCase().includes('fecha_cerrado')
    );

    if (missingFechaCerrado) {
      let fallbackQuery = supabase
        .from('pedido')
        .select(`
          id_pedido,
          total,
          fecha_apertura,
          nombre_cliente,
          apellido_cliente,
          estado_operativo,
          id_usuario,
          id_sucursal_tipo_orden,
          sucursal_tipo_orden!inner (
            tipo_orden!inner (nombre)
          ),
          pedido_producto (
            id_producto,
            cantidad,
            nota,
            producto (nombre)
          ),
          pedido_mesa (
            mesa!inner (numero)
          )
        `)
        .order('fecha_apertura', { ascending: false });

      if (id_sucursal) {
        fallbackQuery = fallbackQuery.eq('id_sucursal', id_sucursal);
      }

      if (estado && !requestingFinalizado) {
        fallbackQuery = fallbackQuery.eq('estado_operativo', estado);
      } else {
        fallbackQuery = fallbackQuery.in('estado_operativo', ['ABIERTO', 'POR_COBRAR', 'CERRADO', 'CANCELADO']);
      }

      const fallbackRes = await fallbackQuery;
      data = fallbackRes.data as any[] | null;
      error = fallbackRes.error;
    }

    if (error) {
      throw new AppError('Error al listar pedidos', 500);
    }

    const pedidos = data ?? [];
    const pedidoIds = pedidos.map((item: any) => Number(item.id_pedido)).filter(Boolean);
    let pedidosFinalizados = new Set<number>();

    if (pedidoIds.length > 0) {
      const { data: auditoriaData } = await supabase
        .from('auditoria')
        .select('id_entidad, valor_nuevo, creado_en')
        .eq('entidad', 'pedido')
        .contains('campos_cambiados', ['estado_operativo'])
        .in('id_entidad', pedidoIds)
        .order('creado_en', { ascending: false });

      const latestByPedido = new Map<number, string>();
      for (const item of (auditoriaData ?? []) as any[]) {
        const idEntidad = Number(item.id_entidad);
        if (!idEntidad || latestByPedido.has(idEntidad)) continue;
        const nuevoEstado = String((item.valor_nuevo as any)?.estado_operativo ?? '').toUpperCase();
        latestByPedido.set(idEntidad, nuevoEstado);
      }

      pedidosFinalizados = new Set(
        Array.from(latestByPedido.entries())
          .filter(([, estadoItem]) => estadoItem === 'FINALIZADO')
          .map(([idEntidad]) => idEntidad)
      );
    }

    const pedidosVisibles = requestingFinalizado
      ? pedidos.filter((item: any) => pedidosFinalizados.has(Number(item.id_pedido)))
      : pedidos.filter((item: any) => !pedidosFinalizados.has(Number(item.id_pedido)));

    // Fetch user names separately
    const userIds = [...new Set(pedidosVisibles.map((item: any) => item.id_usuario).filter(Boolean))];
    const [usersRes] = await Promise.all([
      userIds.length > 0 ? supabase.from('usuario').select('id_usuario, nombre').in('id_usuario', userIds) : Promise.resolve({ data: [] }),
    ]);

    const userMap = new Map(usersRes.data?.map(u => [u.id_usuario, u.nombre]) || []);

    return pedidosVisibles.map((item: any) => ({
      id_pedido: item.id_pedido,
      numero_orden: item.id_pedido.toString(),
      tipo_orden: (item.sucursal_tipo_orden as any)?.tipo_orden?.nombre || 'unknown',
      estado_operativo: item.estado_operativo,
      total: item.total,
      fecha_apertura: item.fecha_apertura,
      fecha_cerrado: (item as any).fecha_cerrado,
      usuario_nombre: userMap.get(item.id_usuario) || null,
      mesa_numero: (item.pedido_mesa as any)?.[0]?.mesa?.numero || null,
      nombre_cliente: item.nombre_cliente,
      apellido_cliente: item.apellido_cliente,
      detalles: ((item.pedido_producto as any[]) ?? []).map((detalle: any) => ({
        id_producto: detalle.id_producto,
        nombre_producto: detalle?.producto?.nombre,
        cantidad: detalle.cantidad,
        nota: detalle.nota,
      })),
    }));
  }

  async obtenerOrdenPorId(id_pedido: number): Promise<OrdenDto | null> {
    const { data, error } = await supabase
      .from('pedido')
      .select('*')
      .eq('id_pedido', id_pedido)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new AppError('Error al obtener pedido', 500);
    }

    return {
      ...data,
      numero_orden: data.id_pedido.toString(),
    };
  }

  async obtenerDetallesOrden(id_pedido: number): Promise<OrdenDetalleDto[]> {
    const { data, error } = await supabase
      .from('pedido_producto')
      .select(`
        id_pedido_producto,
        id_pedido,
        id_producto,
        id_usuario_agrega,
        creado_en,
        id_usuario_entrega,
        cantidad,
        precio_unitario,
        subtotal,
        estado_linea,
        entregado_en,
        cancelado_en,
        nota,
        producto!inner (nombre)
      `)
      .eq('id_pedido', id_pedido);

    if (error) {
      throw new AppError('Error al obtener detalles del pedido', 500);
    }

    return (data ?? []).map(item => ({
      ...item,
      nombre_producto: (item.producto as any)?.nombre,
    }));
  }

  async actualizarOrden(id_pedido: number, dto: ActualizarOrdenDto, actor?: { id_usuario?: number }): Promise<OrdenDto> {
    const updateData: any = {};
    const ordenActual = await this.obtenerOrdenPorId(id_pedido);

    if (!ordenActual) {
      throw new AppError('Pedido no encontrado', 404);
    }

    if (dto.tipo_orden) {
      // Need to change id_sucursal_tipo_orden
      const newIdSucursalTipoOrden = await this.getSucursalTipoOrdenId(ordenActual.id_sucursal, dto.tipo_orden);
      updateData.id_sucursal_tipo_orden = newIdSucursalTipoOrden;
    }

    if (dto.estado_operativo) {
      this.validarTransicionEstado(ordenActual.estado_operativo, dto.estado_operativo);
      updateData.estado_operativo = dto.estado_operativo;
      if (dto.estado_operativo === 'CERRADO' || dto.estado_operativo === 'CANCELADO') {
        updateData.fecha_cerrado = new Date();
      }
    }

    if (dto.nombre_cliente !== undefined) {
      updateData.nombre_cliente = dto.nombre_cliente;
    }

    if (dto.apellido_cliente !== undefined) {
      updateData.apellido_cliente = dto.apellido_cliente;
    }

    if (Object.keys(updateData).length === 0 && dto.id_mesa === undefined) {
      throw new AppError('No hay campos válidos para actualizar', 400);
    }

    // Handle mesa change for dine-in
    if (dto.id_mesa !== undefined) {
      // Remove old pedido_mesa if exists
      await supabase.from('pedido_mesa').delete().eq('id_pedido', id_pedido);
      if (dto.id_mesa) {
        // Add new pedido_mesa
        await supabase.from('pedido_mesa').insert({
          id_pedido,
          id_mesa: dto.id_mesa,
        });
      }
    }

    if (Object.keys(updateData).length > 0) {
      let { error } = await supabase
        .from('pedido')
        .update(updateData)
        .eq('id_pedido', id_pedido);

      const unsupportedFinalizadoEnum = error && dto.estado_operativo === 'FINALIZADO' && (
        error.code === '22P02' ||
        String(error.message ?? '').toLowerCase().includes('estado_operativo_enum')
      );

      if (unsupportedFinalizadoEnum) {
        const fallbackData = { ...updateData };
        delete fallbackData.estado_operativo;

        if (Object.keys(fallbackData).length > 0) {
          const fallbackRes = await supabase
            .from('pedido')
            .update(fallbackData)
            .eq('id_pedido', id_pedido);

          error = fallbackRes.error;
        } else {
          error = null;
        }
      }

      const missingFechaCerrado = error && updateData.fecha_cerrado && (
        error.code === '42703' ||
        String(error.message ?? '').toLowerCase().includes('fecha_cerrado')
      );

      if (missingFechaCerrado) {
        const fallbackData = { ...updateData };
        delete fallbackData.fecha_cerrado;

        const fallbackRes = await supabase
          .from('pedido')
          .update(fallbackData)
          .eq('id_pedido', id_pedido);

        error = fallbackRes.error;
      }

      if (error) {
        throw new AppError('Error al actualizar pedido', 500);
      }
    }

    if (dto.estado_operativo) {
      await this.registrarCambioEstado(id_pedido, ordenActual.estado_operativo, dto.estado_operativo, actor?.id_usuario);
    }

    // Recalculate total if needed
    if (dto.estado_operativo || dto.tipo_orden) {
      await this.recalcularTotales(id_pedido);
    }

    const ordenActualizada = await this.obtenerOrdenPorId(id_pedido);
    if (!ordenActualizada) {
      throw new AppError('Pedido no encontrado', 404);
    }

    return ordenActualizada;
  }

  async obtenerHistorialEstados(id_pedido: number): Promise<HistorialEstadoOrdenDto[]> {
    const { data, error } = await supabase
      .from('auditoria')
      .select('id_auditoria, id_usuario, valor_anterior, valor_nuevo, creado_en')
      .eq('entidad', 'pedido')
      .eq('id_entidad', id_pedido)
      .contains('campos_cambiados', ['estado_operativo'])
      .order('creado_en', { ascending: false });

    if (error) {
      throw new AppError('Error al obtener historial de estados del pedido', 500);
    }

    const userIds = Array.from(new Set((data ?? []).map((item: any) => item.id_usuario).filter(Boolean)));
    let userMap = new Map<number, string>();

    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('usuario')
        .select('id_usuario, nombre')
        .in('id_usuario', userIds);

      userMap = new Map((usersData ?? []).map((user: any) => [Number(user.id_usuario), String(user.nombre)]));
    }

    return (data ?? []).map((item: any) => ({
      id_auditoria: Number(item.id_auditoria),
      estado_anterior: (item.valor_anterior as any)?.estado_operativo ?? null,
      estado_nuevo: (item.valor_nuevo as any)?.estado_operativo ?? null,
      creado_en: item.creado_en,
      id_usuario: item.id_usuario ?? undefined,
      usuario_nombre: item.id_usuario ? (userMap.get(Number(item.id_usuario)) ?? null) : null,
    }));
  }

  async recalcularTotales(id_pedido: number): Promise<void> {
    const detalles = await this.obtenerDetallesOrden(id_pedido);
    const total = await this.calcularTotales(detalles);

    const { error } = await supabase
      .from('pedido')
      .update({ total })
      .eq('id_pedido', id_pedido);

    if (error) {
      throw new AppError('Error al recalcular totales', 500);
    }
  }

  async agregarDetalleOrden(id_pedido: number, id_producto: number, cantidad: number, nota: string | undefined, id_usuario: number): Promise<OrdenDetalleDto> {
    // Get product info
    const { data: producto, error: productoError } = await supabase
      .from('producto')
      .select('precio, nombre')
      .eq('id_producto', id_producto)
      .single();

    if (productoError || !producto) {
      throw new AppError('Producto no encontrado', 404);
    }

    const detalleInsert = {
      id_pedido,
      id_producto,
      id_usuario_agrega: id_usuario,
      cantidad,
      precio_unitario: producto.precio,
      subtotal: cantidad * producto.precio,
      estado_linea: 'PENDIENTE',
      nota,
    };

    const { data, error } = await supabase
      .from('pedido_producto')
      .insert(detalleInsert)
      .select()
      .single();

    if (error) {
      throw new AppError('Error al agregar detalle', 500);
    }

    // Recalculate total
    await this.recalcularTotales(id_pedido);

    return {
      ...data,
      nombre_producto: producto.nombre,
    };
  }

  async actualizarDetalleOrden(id_pedido_producto: number, dto: ActualizarOrdenDetalleDto): Promise<OrdenDetalleDto> {
    const updateData: any = {};

    if (dto.cantidad !== undefined) {
      // Need to recalculate subtotal
      const { data: currentDetalle, error: selectError } = await supabase
        .from('pedido_producto')
        .select('precio_unitario')
        .eq('id_pedido_producto', id_pedido_producto)
        .single();

      if (selectError) {
        throw new AppError('Detalle no encontrado', 404);
      }

      updateData.cantidad = dto.cantidad;
      updateData.subtotal = dto.cantidad * currentDetalle.precio_unitario;
    }

    if (dto.nota !== undefined) {
      updateData.nota = dto.nota;
    }

    if (dto.estado_linea) {
      updateData.estado_linea = dto.estado_linea;
      if (dto.estado_linea === 'ENTREGADO') {
        updateData.entregado_en = new Date();
      } else if (dto.estado_linea === 'CANCELADO') {
        updateData.cancelado_en = new Date();
      }
    }

    const { data, error } = await supabase
      .from('pedido_producto')
      .update(updateData)
      .eq('id_pedido_producto', id_pedido_producto)
      .select()
      .single();

    if (error) {
      throw new AppError('Error al actualizar detalle', 500);
    }

    // Recalculate total if cantidad changed
    if (dto.cantidad !== undefined) {
      const { data: detalle } = await supabase
        .from('pedido_producto')
        .select('id_pedido')
        .eq('id_pedido_producto', id_pedido_producto)
        .single();
      await this.recalcularTotales(detalle!.id_pedido);
    }

    return data;
  }

  async removerDetalleOrden(id_pedido_producto: number): Promise<void> {
    // Get id_pedido before deleting
    const { data: detalle, error: selectError } = await supabase
      .from('pedido_producto')
      .select('id_pedido')
      .eq('id_pedido_producto', id_pedido_producto)
      .single();

    if (selectError) {
      throw new AppError('Detalle no encontrado', 404);
    }

    const { error } = await supabase
      .from('pedido_producto')
      .delete()
      .eq('id_pedido_producto', id_pedido_producto);

    if (error) {
      throw new AppError('Error al remover detalle', 500);
    }

    // Recalculate total
    await this.recalcularTotales(detalle.id_pedido);
  }

  async cancelarOrden(id_pedido: number): Promise<void> {
    const { error } = await supabase
      .from('pedido')
      .update({
        estado_operativo: 'CANCELADO',
        estado_financiero: 'SIN_PAGAR'
      })
      .eq('id_pedido', id_pedido);

    if (error) {
      throw new AppError('Error al cancelar pedido', 500);
    }
  }
}