import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import { AuditoriaService } from './auditoria.service';
import type {
  PedidoProveedorItem,
  PedidoProveedorDetalleItem,
  CrearPedidoProveedorDto,
  EditarPedidoProveedorDto,
  RecibirPedidoProveedorDto,
} from '../domain/interfaces/pedido-proveedor.interface';

export class PedidoProveedorService {

  async listar(filters?: { id_sucursal?: number; id_proveedor?: number }): Promise<PedidoProveedorItem[]> {
    let query = supabase
      .from('pedido_proveedor')
      .select('*')
      .order('fecha_pedido', { ascending: false });

    if (filters?.id_sucursal) query = query.eq('id_sucursal', filters.id_sucursal);
    if (filters?.id_proveedor) query = query.eq('id_proveedor', filters.id_proveedor);

    const { data, error } = await query;
    if (error) throw new AppError('Error al listar pedidos a proveedor', 500);

    const rows = data ?? [];
    if (rows.length === 0) return [];

    // Fetch proveedor names
    const idProveedores = [...new Set(rows.map((r: any) => r.id_proveedor))];
    const { data: proveedores } = await supabase
      .from('proveedor')
      .select('id_proveedor, nombre')
      .in('id_proveedor', idProveedores);

    // Fetch sucursal names
    const idSucursales = [...new Set(rows.map((r: any) => r.id_sucursal))];
    const { data: sucursales } = await supabase
      .from('sucursal')
      .select('id_sucursal, nombre')
      .in('id_sucursal', idSucursales);

    const proveedorMap = new Map((proveedores ?? []).map((p: any) => [p.id_proveedor, p.nombre]));
    const sucursalMap = new Map((sucursales ?? []).map((s: any) => [s.id_sucursal, s.nombre]));

    return rows.map((r: any) => ({
      id_pedido_proveedor: r.id_pedido_proveedor,
      id_proveedor: r.id_proveedor,
      nombre_proveedor: proveedorMap.get(r.id_proveedor) ?? '',
      id_sucursal: r.id_sucursal,
      nombre_sucursal: sucursalMap.get(r.id_sucursal) ?? '',
      id_usuario_sucursal: r.id_usuario_sucursal,
      fecha_pedido: r.fecha_pedido,
      fecha_entrega: r.fecha_entrega ?? null,
      estado: r.estado,
      monto_total: Number(r.monto_total),
      nombre_creador: '',
    }));
  }

  async obtenerConDetalle(id_pedido_proveedor: number): Promise<PedidoProveedorItem> {
    const { data: pedido, error } = await supabase
      .from('pedido_proveedor')
      .select('*')
      .eq('id_pedido_proveedor', id_pedido_proveedor)
      .single();

    if (error || !pedido) throw new AppError('Pedido no encontrado', 404);

    // Fetch proveedor, sucursal and creator name
    const [{ data: proveedor }, { data: sucursal }, { data: usuarioSucursal }] = await Promise.all([
      supabase.from('proveedor').select('nombre').eq('id_proveedor', pedido.id_proveedor).single(),
      supabase.from('sucursal').select('nombre').eq('id_sucursal', pedido.id_sucursal).single(),
      supabase.from('usuario_sucursal').select('id_usuario').eq('id_usuario_sucursal', pedido.id_usuario_sucursal).single(),
    ]);

    let nombreCreador = '';
    if (usuarioSucursal?.id_usuario) {
      const { data: usuario } = await supabase
        .from('usuario')
        .select('nombre')
        .eq('id_usuario', usuarioSucursal.id_usuario)
        .single();
      nombreCreador = usuario?.nombre ?? '';
    }

    // Fetch detalles
    const { data: detalles, error: detallesError } = await supabase
      .from('pedido_proveedor_detalle')
      .select('*')
      .eq('id_pedido_proveedor', id_pedido_proveedor);

    if (detallesError) throw new AppError('Error al obtener detalle del pedido', 500);

    const detallesRows = detalles ?? [];
    let detallesMapeados: PedidoProveedorDetalleItem[] = [];

    if (detallesRows.length > 0) {
      const idIngredientes = [...new Set(detallesRows.map((d: any) => d.id_ingrediente))];
      const { data: ingredientes } = await supabase
        .from('ingrediente')
        .select('id_ingrediente, nombre, unidad_medida')
        .in('id_ingrediente', idIngredientes);

      const ingMap = new Map((ingredientes ?? []).map((i: any) => [i.id_ingrediente, i]));

      detallesMapeados = detallesRows.map((d: any) => {
        const ing = ingMap.get(d.id_ingrediente);
        return {
          id_pedido_proveedor_detalle: d.id_pedido_proveedor_detalle,
          id_ingrediente: d.id_ingrediente,
          nombre_ingrediente: ing?.nombre ?? '',
          unidad_medida: ing?.unidad_medida ?? '',
          cantidad: Number(d.cantidad),
          precio_unitario: d.precio_unitario != null ? Number(d.precio_unitario) : null,
          creado_en: d.creado_en,
        };
      });
    }

    return {
      id_pedido_proveedor: pedido.id_pedido_proveedor,
      id_proveedor: pedido.id_proveedor,
      nombre_proveedor: proveedor?.nombre ?? '',
      id_sucursal: pedido.id_sucursal,
      nombre_sucursal: sucursal?.nombre ?? '',
      id_usuario_sucursal: pedido.id_usuario_sucursal,
      fecha_pedido: pedido.fecha_pedido,
      fecha_entrega: pedido.fecha_entrega ?? null,
      estado: pedido.estado,
      monto_total: Number(pedido.monto_total),
      nombre_creador: nombreCreador,
      detalles: detallesMapeados,
    };
  }

  async crear(dto: CrearPedidoProveedorDto, id_usuario_sucursal: number): Promise<PedidoProveedorItem> {
    // Validate proveedor
    const { data: proveedor } = await supabase
      .from('proveedor')
      .select('id_proveedor')
      .eq('id_proveedor', dto.id_proveedor)
      .eq('activo', true)
      .single();
    if (!proveedor) throw new AppError('Proveedor no encontrado o inactivo', 404);

    // Validate sucursal
    const { data: sucursal } = await supabase
      .from('sucursal')
      .select('id_sucursal')
      .eq('id_sucursal', dto.id_sucursal)
      .single();
    if (!sucursal) throw new AppError('Sucursal no encontrada', 404);

    // Validate ingredientes
    const idIngredientes = dto.detalles.map(d => d.id_ingrediente);
    const { data: ingredientesExistentes } = await supabase
      .from('ingrediente')
      .select('id_ingrediente')
      .in('id_ingrediente', idIngredientes);

    const idsEncontrados = new Set((ingredientesExistentes ?? []).map((i: any) => i.id_ingrediente));
    const idFaltante = idIngredientes.find(id => !idsEncontrados.has(id));
    if (idFaltante) throw new AppError(`Ingrediente con id ${idFaltante} no encontrado`, 404);

    // Calculate total
    const monto_total = dto.detalles.reduce((sum, d) => sum + d.cantidad * d.precio_unitario, 0);

    // Insert pedido
    const { data: nuevoPedido, error: errorPedido } = await supabase
      .from('pedido_proveedor')
      .insert({
        id_proveedor: dto.id_proveedor,
        id_sucursal: dto.id_sucursal,
        id_usuario_sucursal,
        estado: 'PENDIENTE',
        fecha_entrega: dto.fecha_entrega ?? null,
        monto_total,
      })
      .select()
      .single();

    if (errorPedido || !nuevoPedido) throw new AppError('Error al crear pedido al proveedor', 500);

    // Insert detalles
    const detallesInsert = dto.detalles.map(d => ({
      id_pedido_proveedor: nuevoPedido.id_pedido_proveedor,
      id_ingrediente: d.id_ingrediente,
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario ?? null,
    }));

    const { error: errorDetalles } = await supabase
      .from('pedido_proveedor_detalle')
      .insert(detallesInsert);

    if (errorDetalles) throw new AppError('Error al guardar el detalle del pedido', 500);

    return this.obtenerConDetalle(nuevoPedido.id_pedido_proveedor);
  }

  async actualizar(
    id_pedido_proveedor: number,
    dto: EditarPedidoProveedorDto,
    id_usuario: number,
    usuario_context: { id_sucursal: number | null; rol: string },
  ): Promise<PedidoProveedorItem> {
    const auditoriaService = new AuditoriaService();

    // Snapshot anterior completo
    const anterior = await this.obtenerConDetalle(id_pedido_proveedor);

    // Autorización: encargado solo puede modificar órdenes de su sucursal
    if (usuario_context.rol !== 'admin' && anterior.id_sucursal !== usuario_context.id_sucursal) {
      throw new AppError('No tienes permiso para modificar esta orden', 403);
    }

    // Validación de transición de estado
    if (anterior.estado === 'RECIBIDO') {
      throw new AppError('Una orden recibida no puede modificarse', 400);
    }
    if (anterior.estado === 'CANCELADO') {
      throw new AppError('Una orden cancelada no puede modificarse', 400);
    }

    const camposModificados: string[] = [];
    const headerUpdate: Record<string, unknown> = {};

    if (dto.estado !== undefined && dto.estado !== anterior.estado) {
      headerUpdate.estado = dto.estado;
      camposModificados.push('estado');
    }

    // Auto fecha_entrega al confirmar recepción
    if (dto.estado === 'RECIBIDO') {
      headerUpdate.fecha_entrega = new Date().toISOString();
      camposModificados.push('fecha_entrega');
    } else if (dto.fecha_entrega !== undefined) {
      const fechaAnterior = anterior.fecha_entrega ?? null;
      const fechaNueva = dto.fecha_entrega ?? null;
      if (fechaAnterior !== fechaNueva) {
        headerUpdate.fecha_entrega = fechaNueva;
        camposModificados.push('fecha_entrega');
      }
    }

    if (dto.detalles !== undefined) {
      // Validate all ingredientes exist
      const ids = dto.detalles.map(d => d.id_ingrediente);
      const { data: ingExistentes } = await supabase
        .from('ingrediente')
        .select('id_ingrediente')
        .in('id_ingrediente', ids);
      const idsEncontrados = new Set((ingExistentes ?? []).map((i: any) => i.id_ingrediente));
      const idFaltante = ids.find(id => !idsEncontrados.has(id));
      if (idFaltante) throw new AppError(`Ingrediente con id ${idFaltante} no encontrado`, 404);

      // Replace detalles
      const { error: errDel } = await supabase
        .from('pedido_proveedor_detalle')
        .delete()
        .eq('id_pedido_proveedor', id_pedido_proveedor);
      if (errDel) throw new AppError('Error al actualizar el detalle del pedido', 500);

      const nuevosDetalles = dto.detalles.map(d => ({
        id_pedido_proveedor,
        id_ingrediente: d.id_ingrediente,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
      }));
      const { error: errIns } = await supabase.from('pedido_proveedor_detalle').insert(nuevosDetalles);
      if (errIns) throw new AppError('Error al guardar el detalle actualizado', 500);

      // Recalculate total
      headerUpdate.monto_total = dto.detalles.reduce((sum, d) => sum + d.cantidad * d.precio_unitario, 0);
      camposModificados.push('detalles', 'monto_total');
    }

    if (Object.keys(headerUpdate).length > 0) {
      const { error: errUpd } = await supabase
        .from('pedido_proveedor')
        .update(headerUpdate)
        .eq('id_pedido_proveedor', id_pedido_proveedor);
      if (errUpd) throw new AppError('Error al actualizar el pedido', 500);
    }

    const posterior = await this.obtenerConDetalle(id_pedido_proveedor);

    if (camposModificados.length > 0) {
      await auditoriaService.registrar({
        entidad: 'pedido_proveedor',
        accion: 'UPDATE',
        id_entidad: id_pedido_proveedor,
        id_usuario,
        campos_cambiados: camposModificados,
        valor_anterior: {
          estado: anterior.estado,
          fecha_entrega: anterior.fecha_entrega,
          monto_total: anterior.monto_total,
          detalles: anterior.detalles?.map(d => ({
            id_ingrediente: d.id_ingrediente,
            nombre_ingrediente: d.nombre_ingrediente,
            cantidad: d.cantidad,
            precio_unitario: d.precio_unitario,
          })),
        },
        valor_nuevo: {
          estado: posterior.estado,
          fecha_entrega: posterior.fecha_entrega,
          monto_total: posterior.monto_total,
          detalles: posterior.detalles?.map(d => ({
            id_ingrediente: d.id_ingrediente,
            nombre_ingrediente: d.nombre_ingrediente,
            cantidad: d.cantidad,
            precio_unitario: d.precio_unitario,
          })),
        },
      });
    }

    return posterior;
  }

  async recibirPedido(
    id_pedido_proveedor: number,
    dto: RecibirPedidoProveedorDto,
    id_usuario: number,
    usuario_context: { id_sucursal: number | null; rol: string },
  ): Promise<PedidoProveedorItem> {
    const auditoriaService = new AuditoriaService();

    const pedido = await this.obtenerConDetalle(id_pedido_proveedor);

    if (usuario_context.rol !== 'admin' && pedido.id_sucursal !== usuario_context.id_sucursal) {
      throw new AppError('No tienes permiso para modificar esta orden', 403);
    }

    if (pedido.estado !== 'PENDIENTE') {
      throw new AppError('Solo se pueden recibir órdenes en estado PENDIENTE', 400);
    }

    const { data: bodega } = await supabase
      .from('bodega')
      .select('id_bodega')
      .eq('id_bodega', dto.id_bodega)
      .eq('id_sucursal', pedido.id_sucursal)
      .eq('activo', true)
      .single();
    if (!bodega) throw new AppError('La bodega no pertenece a esta sucursal o está inactiva', 400);

    // Actualizar cantidad recibida en cada detalle
    for (const det of dto.detalles) {
      const { error } = await supabase
        .from('pedido_proveedor_detalle')
        .update({ cantidad: det.cantidad })
        .eq('id_pedido_proveedor_detalle', det.id_pedido_proveedor_detalle);
      if (error) throw new AppError('Error al actualizar cantidad del detalle', 500);
    }

    // Incrementar stock y registrar movimiento por ingrediente
    for (const det of dto.detalles) {
      // Buscar registro existente del mismo ingrediente + bodega + lote
      // Si viene con lote, buscar coincidencia exacta; sin lote, buscar registro sin lote
      let invQuery = supabase
        .from('inventario')
        .select('id_inventario, stock_actual')
        .eq('id_ingrediente', det.id_ingrediente)
        .eq('id_bodega', dto.id_bodega);

      if (det.lote) {
        invQuery = invQuery.eq('lote', det.lote);
      } else {
        invQuery = invQuery.is('lote', null);
      }

      const { data: invExistente } = await invQuery.maybeSingle();

      let id_inventario: number;
      let stock_anterior: number;
      let stock_nuevo: number;

      if (invExistente) {
        stock_anterior = Number(invExistente.stock_actual);
        stock_nuevo = stock_anterior + det.cantidad;
        const updateFields: Record<string, unknown> = {
          stock_actual: stock_nuevo,
          ultima_modificacion: new Date().toISOString().split('T')[0],
        };
        if (det.fecha_vencimiento) updateFields.fecha_vencimiento = det.fecha_vencimiento;
        const { error } = await supabase
          .from('inventario')
          .update(updateFields)
          .eq('id_inventario', invExistente.id_inventario);
        if (error) throw new AppError('Error al actualizar el stock', 500);
        id_inventario = invExistente.id_inventario;
      } else {
        const { data: nuevoInv, error } = await supabase
          .from('inventario')
          .insert({
            id_ingrediente: det.id_ingrediente,
            id_bodega: dto.id_bodega,
            id_usuario,
            stock_actual: det.cantidad,
            stock_minimo: 0,
            stock_maximo: 0,
            activo: true,
            lote: det.lote ?? null,
            fecha_vencimiento: det.fecha_vencimiento ?? null,
            ultima_modificacion: new Date().toISOString().split('T')[0],
          })
          .select('id_inventario')
          .single();
        if (error || !nuevoInv) throw new AppError('Error al crear registro de inventario', 500);
        stock_anterior = 0;
        stock_nuevo = det.cantidad;
        id_inventario = nuevoInv.id_inventario;
      }

      const { error: errMov } = await supabase
        .from('movimiento_inventario')
        .insert({
          tipo: 'ENTRADA_COMPRA',
          id_inventario,
          id_usuario,
          cantidad: det.cantidad,
          stock_anterior,
          stock_nuevo,
          nota: `Recepción orden #${id_pedido_proveedor}`,
          id_pedido_proveedor,
        });
      if (errMov) throw new AppError('Error al registrar movimiento de inventario', 500);
    }

    // Cambiar estado AL FINAL para garantizar consistencia
    const { error: errEstado } = await supabase
      .from('pedido_proveedor')
      .update({
        estado: 'RECIBIDO',
        fecha_entrega: new Date().toISOString(),
      })
      .eq('id_pedido_proveedor', id_pedido_proveedor);
    if (errEstado) throw new AppError('Error al actualizar el estado del pedido', 500);

    await auditoriaService.registrar({
      entidad: 'pedido_proveedor',
      accion: 'UPDATE',
      id_entidad: id_pedido_proveedor,
      id_usuario,
      campos_cambiados: ['estado', 'fecha_entrega'],
      valor_anterior: { estado: 'PENDIENTE' },
      valor_nuevo: { estado: 'RECIBIDO', id_bodega: dto.id_bodega },
    });

    return this.obtenerConDetalle(id_pedido_proveedor);
  }
}
