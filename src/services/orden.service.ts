import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import type { OrdenDto, OrdenDetalleDto, OrdenListItem, ActualizarOrdenDto, ActualizarOrdenDetalleDto, CrearOrdenDto, TipoOrden } from '../domain/interfaces/orden.interface';

export class OrdenService {

  async crearOrden(dto: CrearOrdenDto, id_usuario: number): Promise<OrdenDto & { detalles: OrdenDetalleDto[] }> {
    const { data: tipoOrdenData, error: tipoOrdenError } = await supabase
      .from('tipo_orden')
      .select('id_tipo_orden, requiere_mesa')
      .ilike('nombre', dto.tipo_orden.trim())
      .single();

    if (tipoOrdenError || !tipoOrdenData) {
      throw new AppError('Tipo de orden no encontrado', 400);
    }

    if (tipoOrdenData.requiere_mesa && !dto.id_mesa) {
      throw new AppError('El tipo de orden seleccionado requiere una mesa', 400);
    }

    const { data: sucursalTipoData, error: sucursalTipoError } = await supabase
      .from('sucursal_tipo_orden')
      .select('id_sucursal_tipo_orden')
      .eq('id_sucursal', dto.id_sucursal)
      .eq('id_tipo_orden', tipoOrdenData.id_tipo_orden)
      .eq('activo', true)
      .single();

    if (sucursalTipoError || !sucursalTipoData) {
      throw new AppError('Tipo de orden no disponible para esta sucursal', 400);
    }

    const pedidoPayload = {
      id_usuario,
      total: 0,
      id_sucursal_tipo_orden: sucursalTipoData.id_sucursal_tipo_orden,
      id_sucursal: dto.id_sucursal,
      estado_operativo: 'NUEVO',
      estado_financiero: 'SIN_PAGAR',
      nombre_cliente: dto.nombre_cliente.trim(),
      apellido_cliente: dto.apellido_cliente.trim(),
    };

    const { data: pedido, error: pedidoError } = await supabase
      .from('pedido')
      .insert(pedidoPayload)
      .select()
      .single();

    if (pedidoError || !pedido) {
      throw new AppError('Error al crear pedido', 500);
    }

    if (dto.id_mesa) {
      const { error: pedidoMesaError } = await supabase
        .from('pedido_mesa')
        .insert({ id_pedido: pedido.id_pedido, id_mesa: dto.id_mesa, activo: true });

      if (pedidoMesaError) {
        throw new AppError('Error al asignar la mesa al pedido', 500);
      }
    }

    for (const detalle of dto.detalles) {
      const { data: producto, error: productoError } = await supabase
        .from('producto')
        .select('precio, nombre')
        .eq('id_producto', detalle.id_producto)
        .single();

      if (productoError || !producto) {
        throw new AppError(`Producto ${detalle.id_producto} no encontrado`, 404);
      }

      const subtotal = detalle.cantidad * producto.precio;
      const { error: detalleError } = await supabase
        .from('pedido_producto')
        .insert({
          id_pedido: pedido.id_pedido,
          id_producto: detalle.id_producto,
          id_usuario_agrega: id_usuario,
          cantidad: detalle.cantidad,
          precio_unitario: producto.precio,
          subtotal,
          estado_linea: 'PENDIENTE',
          nota: detalle.nota,
        });

      if (detalleError) {
        throw new AppError('Error al agregar detalle al pedido', 500);
      }
    }

    await this.recalcularTotales(pedido.id_pedido);

    const orden = await this.obtenerOrdenPorId(pedido.id_pedido);
    if (!orden) {
      throw new AppError('Pedido no encontrado después de crearlo', 500);
    }

    const detalles = await this.obtenerDetallesOrden(pedido.id_pedido);
    return { ...orden, detalles };
  }

  async getSucursalTipoOrdenId(id_sucursal: number, tipo_orden: TipoOrden): Promise<number> {
    // First get tipo_orden id
    const { data: tipoData, error: tipoError } = await supabase
      .from('tipo_orden')
      .select('id_tipo_orden')
      .eq('nombre', tipo_orden)
      .single();

    if (tipoError || !tipoData) {
      throw new AppError('Tipo de orden no encontrado', 400);
    }

    // Then get sucursal_tipo_orden id
    const { data: sucursalTipoData, error: sucursalTipoError } = await supabase
      .from('sucursal_tipo_orden')
      .select('id_sucursal_tipo_orden')
      .eq('id_sucursal', id_sucursal)
      .eq('id_tipo_orden', tipoData.id_tipo_orden)
      .single();

    if (sucursalTipoError || !sucursalTipoData) {
      throw new AppError('Tipo de orden no disponible para esta sucursal', 400);
    }

    return sucursalTipoData.id_sucursal_tipo_orden;
  }

  async calcularTotales(detalles: OrdenDetalleDto[]): Promise<number> {
    return detalles.reduce((sum, d) => sum + d.subtotal, 0);
  }

  async listarOrdenes(id_sucursal?: number, estado?: string): Promise<OrdenListItem[]> {
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
        estado_financiero,
        id_usuario,
        id_sucursal_tipo_orden,
        sucursal_tipo_orden!inner (
          tipo_orden!inner (nombre)
        ),
        pedido_mesa (
          mesa!inner (numero)
        )
      `)
      .order('fecha_apertura', { ascending: false });

    if (id_sucursal) {
      query = query.eq('id_sucursal', id_sucursal);
    }

    if (estado) {
      query = query.eq('estado_operativo', estado);
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError('Error al listar pedidos', 500);
    }

    // Fetch user names separately
    const userIds = [...new Set(data?.map(item => item.id_usuario).filter(Boolean))];
    const [usersRes] = await Promise.all([
      userIds.length > 0 ? supabase.from('usuario').select('id_usuario, nombre').in('id_usuario', userIds) : Promise.resolve({ data: [] }),
    ]);

    const userMap = new Map(usersRes.data?.map(u => [u.id_usuario, u.nombre]) || []);

    const orderIds = (data ?? []).map(item => item.id_pedido);
    const { data: detallesRaw, error: detallesError } = orderIds.length > 0
      ? await supabase
        .from('pedido_producto')
        .select(`
          id_pedido,
          id_producto,
          cantidad,
          nota,
          producto!inner(nombre)
        `)
        .in('id_pedido', orderIds)
      : { data: [], error: null };

    if (detallesError) {
      throw new AppError('Error al listar detalle de pedidos', 500);
    }

    const detallesMap = new Map<number, Array<{ id_producto: number; nombre_producto?: string; cantidad: number; nota?: string }>>();
    for (const detalle of (detallesRaw ?? [])) {
      const idPedido = (detalle as any).id_pedido as number;
      const list = detallesMap.get(idPedido) ?? [];
      list.push({
        id_producto: (detalle as any).id_producto,
        nombre_producto: (detalle as any).producto?.nombre,
        cantidad: (detalle as any).cantidad,
        nota: (detalle as any).nota ?? undefined,
      });
      detallesMap.set(idPedido, list);
    }

    return (data ?? []).map(item => ({
      id_pedido: item.id_pedido,
      numero_orden: item.id_pedido.toString(),
      tipo_orden: (item.sucursal_tipo_orden as any)?.tipo_orden?.nombre || 'unknown',
      estado_operativo: item.estado_operativo,
      estado_financiero: (item as any).estado_financiero,
      total: item.total,
      fecha_apertura: item.fecha_apertura,
      fecha_cerrado: (item as any).fecha_cerrado ?? null,
      usuario_nombre: userMap.get(item.id_usuario) || null,
      mesa_numero: (item.pedido_mesa as any)?.[0]?.mesa?.numero || null,
      nombre_cliente: item.nombre_cliente,
      apellido_cliente: item.apellido_cliente,
      detalles: detallesMap.get(item.id_pedido) ?? [],
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

  async actualizarOrden(id_pedido: number, dto: ActualizarOrdenDto): Promise<OrdenDto> {
    const updateData: any = {};

    if (dto.tipo_orden) {
      // Need to change id_sucursal_tipo_orden
      const orden = await this.obtenerOrdenPorId(id_pedido);
      if (orden) {
        const newIdSucursalTipoOrden = await this.getSucursalTipoOrdenId(orden.id_sucursal, dto.tipo_orden);
        updateData.id_sucursal_tipo_orden = newIdSucursalTipoOrden;
      }
    }

    if (dto.estado_operativo) {
      updateData.estado_operativo = dto.estado_operativo;
      if (['ENTREGADO', 'CANCELADO', 'OCULTO'].includes(dto.estado_operativo)) {
        updateData.fecha_cerrado = new Date();
      }
    }

    if (dto.nombre_cliente !== undefined) {
      updateData.nombre_cliente = dto.nombre_cliente;
    }

    if (dto.apellido_cliente !== undefined) {
      updateData.apellido_cliente = dto.apellido_cliente;
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

    const { data, error } = await supabase
      .from('pedido')
      .update(updateData)
      .eq('id_pedido', id_pedido)
      .select()
      .single();

    if (error) {
      throw new AppError('Error al actualizar pedido', 500);
    }

    // Recalculate total if needed
    if (dto.estado_operativo || dto.tipo_orden) {
      await this.recalcularTotales(id_pedido);
    }

    return {
      ...data,
      numero_orden: data.id_pedido.toString(),
    };
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

    const detalle: OrdenDetalleDto = {
      id_pedido,
      id_producto,
      id_usuario_agrega: id_usuario,
      cantidad,
      precio_unitario: producto.precio,
      subtotal: cantidad * producto.precio,
      estado_linea: 'PENDIENTE',
      nota,
      nombre_producto: producto.nombre,
    };

    const { data, error } = await supabase
      .from('pedido_producto')
      .insert(detalle)
      .select()
      .single();

    if (error) {
      throw new AppError('Error al agregar detalle', 500);
    }

    // Recalculate total
    await this.recalcularTotales(id_pedido);

    return data;
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