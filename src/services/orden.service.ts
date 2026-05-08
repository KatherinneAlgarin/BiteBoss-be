import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import type { OrdenDto, OrdenDetalleDto, OrdenListItem, CrearOrdenDto, ActualizarOrdenDto, ActualizarOrdenDetalleDto, TipoOrden } from '../domain/interfaces/orden.interface';

export class OrdenService {

  async generarNumeroOrden(id_sucursal: number, tipo_orden: TipoOrden): Promise<string> {
    // For now, use a simple counter based on id_pedido
    const { data, error } = await supabase
      .from('pedido')
      .select('id_pedido')
      .eq('id_sucursal', id_sucursal)
      .order('id_pedido', { ascending: false })
      .limit(1);

    if (error) {
      throw new AppError('Error al generar número de orden', 500);
    }

    let numero = 1;
    if (data && data.length > 0) {
      numero = data[0].id_pedido + 1;
    }

    const prefijo = tipo_orden === 'dine-in' ? 'M' : tipo_orden === 'takeout' ? 'L' : 'D';
    return `${prefijo}-${numero.toString().padStart(4, '0')}`;
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

  async crearOrden(dto: CrearOrdenDto, id_usuario: number): Promise<OrdenDto> {
    // Get id_sucursal_tipo_orden
    const id_sucursal_tipo_orden = await this.getSucursalTipoOrdenId(dto.id_sucursal, dto.tipo_orden);

    // Get prices and calculate subtotals
    const productosIds = dto.detalles.map(d => d.id_producto);
    const { data: productos, error: productosError } = await supabase
      .from('producto')
      .select('id_producto, precio, nombre')
      .in('id_producto', productosIds);

    if (productosError || !productos) {
      throw new AppError('Error al obtener precios de productos', 500);
    }

    const precioMap = new Map(productos.map(p => [p.id_producto, { precio: p.precio, nombre: p.nombre }]));

    // Create detalles with subtotals
    const detalles: OrdenDetalleDto[] = dto.detalles.map(d => {
      const prodInfo = precioMap.get(d.id_producto);
      if (!prodInfo) throw new AppError(`Producto ${d.id_producto} no encontrado`, 400);
      return {
        id_pedido: 0, // Will be set after creating pedido
        id_producto: d.id_producto,
        id_usuario_agrega: id_usuario,
        cantidad: d.cantidad,
        precio_unitario: prodInfo.precio,
        subtotal: d.cantidad * prodInfo.precio,
        estado_linea: 'PENDIENTE',
        nota: d.nota,
        nombre_producto: prodInfo.nombre,
      };
    });

    // Calculate total
    const total = await this.calcularTotales(detalles);

    // Create pedido
    const pedidoData = {
      id_usuario,
      total,
      id_sucursal_tipo_orden,
      id_sucursal: dto.id_sucursal,
      estado_operativo: 'ABIERTO',
      estado_financiero: 'SIN_PAGAR',
      nombre_cliente: dto.nombre_cliente,
      apellido_cliente: dto.apellido_cliente,
    };

    const { data: pedido, error: pedidoError } = await supabase
      .from('pedido')
      .insert(pedidoData)
      .select()
      .single();

    if (pedidoError) {
      throw new AppError('Error al crear pedido', 500);
    }

    // Create pedido_producto
    const detallesConPedido = detalles.map(d => ({ ...d, id_pedido: pedido.id_pedido }));
    const { error: detallesError } = await supabase
      .from('pedido_producto')
      .insert(detallesConPedido);

    if (detallesError) {
      // Rollback
      await supabase.from('pedido').delete().eq('id_pedido', pedido.id_pedido);
      throw new AppError('Error al crear detalles del pedido', 500);
    }

    // If dine-in, create pedido_mesa
    if (dto.tipo_orden === 'dine-in' && dto.id_mesa) {
      const { error: mesaError } = await supabase
        .from('pedido_mesa')
        .insert({
          id_mesa: dto.id_mesa,
          id_pedido: pedido.id_pedido,
        });

      if (mesaError) {
        // Rollback
        await supabase.from('pedido_producto').delete().eq('id_pedido', pedido.id_pedido);
        await supabase.from('pedido').delete().eq('id_pedido', pedido.id_pedido);
        throw new AppError('Error al asignar mesa', 500);
      }
    }

    return {
      ...pedido,
      numero_orden: pedido.id_pedido.toString(), // Use id_pedido as numero_orden
    };
  }

  async listarOrdenes(id_sucursal?: number, estado?: string): Promise<OrdenListItem[]> {
    let query = supabase
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

    return (data ?? []).map(item => ({
      id_pedido: item.id_pedido,
      numero_orden: item.id_pedido.toString(),
      tipo_orden: (item.sucursal_tipo_orden as any)?.tipo_orden?.nombre || 'unknown',
      estado_operativo: item.estado_operativo,
      total: item.total,
      fecha_apertura: item.fecha_apertura,
      usuario_nombre: userMap.get(item.id_usuario) || null,
      mesa_numero: (item.pedido_mesa as any)?.[0]?.mesa?.numero || null,
      nombre_cliente: item.nombre_cliente,
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