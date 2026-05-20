import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import { AuditoriaService } from './auditoria.service';
import type {
  PedidoProveedorItem,
  PedidoProveedorDetalleItem,
  CrearPedidoProveedorDto,
  EditarPedidoProveedorDto,
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
    }));
  }

  async obtenerConDetalle(id_pedido_proveedor: number): Promise<PedidoProveedorItem> {
    const { data: pedido, error } = await supabase
      .from('pedido_proveedor')
      .select('*')
      .eq('id_pedido_proveedor', id_pedido_proveedor)
      .single();

    if (error || !pedido) throw new AppError('Pedido no encontrado', 404);

    // Fetch proveedor and sucursal names
    const [{ data: proveedor }, { data: sucursal }] = await Promise.all([
      supabase.from('proveedor').select('nombre').eq('id_proveedor', pedido.id_proveedor).single(),
      supabase.from('sucursal').select('nombre').eq('id_sucursal', pedido.id_sucursal).single(),
    ]);

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

  async actualizar(id_pedido_proveedor: number, dto: EditarPedidoProveedorDto, id_usuario: number): Promise<PedidoProveedorItem> {
    const auditoriaService = new AuditoriaService();

    // Snapshot anterior completo
    const anterior = await this.obtenerConDetalle(id_pedido_proveedor);

    const camposModificados: string[] = [];
    const headerUpdate: Record<string, unknown> = {};

    if (dto.estado !== undefined && dto.estado !== anterior.estado) {
      headerUpdate.estado = dto.estado;
      camposModificados.push('estado');
    }

    if (dto.fecha_entrega !== undefined) {
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
}
