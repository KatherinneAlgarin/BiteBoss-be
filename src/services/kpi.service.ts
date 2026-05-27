import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import type {
  KpiVentasResponse,
  KpiResumen,
  KpiMetodoPago,
  KpiTipoOrden,
  KpiProducto,
  KpiTendencia,
  KpiSucursalResumen,
} from '../domain/interfaces/kpi.interface';

export class KpiService {

  // ─── Público ─────────────────────────────────────────────────────────────

  async obtenerVentas(params: {
    fecha_inicio: string;
    fecha_fin: string;
    id_sucursal?: number;
  }): Promise<KpiVentasResponse> {
    const pedidos = await this.fetchPedidosPagados(params);

    if (pedidos.length === 0) {
      return this.respuestaVacia(params.fecha_inicio, params.fecha_fin);
    }

    const ids = pedidos.map(p => p.id_pedido);
    const idsSucursalTipoOrden = [...new Set(pedidos.map(p => p.id_sucursal_tipo_orden).filter(Boolean))] as number[];

    const [pagos, detalles, tiposOrden] = await Promise.all([
      this.fetchPagosPedido(ids),
      this.fetchDetallesPedido(ids),
      this.fetchTiposOrden(idsSucursalTipoOrden),
    ]);

    const resumen = this.calcularResumen(pedidos, pagos);
    const porMetodoPago = this.agruparPorMetodoPago(pagos, resumen.total_ventas);
    const porTipoOrden = this.agruparPorTipoOrden(pedidos, tiposOrden, resumen.total_ventas);
    const topProductos = this.agruparTopProductos(detalles);
    const tendencia = this.calcularTendencia(pedidos, params.fecha_inicio, params.fecha_fin);

    return { resumen, por_metodo_pago: porMetodoPago, por_tipo_orden: porTipoOrden, top_productos: topProductos, tendencia };
  }

  async obtenerComparativa(params: {
    fecha_inicio: string;
    fecha_fin: string;
  }): Promise<KpiSucursalResumen[]> {
    const { data: sucursales, error } = await supabase
      .from('sucursal')
      .select('id_sucursal, nombre')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) throw new AppError('Error al obtener sucursales', 500);

    const resultados = await Promise.all(
      (sucursales ?? []).map(async (s: any) => {
        const ventas = await this.obtenerVentas({ ...params, id_sucursal: s.id_sucursal });
        return {
          id_sucursal: s.id_sucursal,
          nombre: s.nombre,
          resumen: ventas.resumen,
          top_producto: ventas.top_productos[0] ?? null,
          metodo_predominante: ventas.por_metodo_pago[0] ?? null,
          tendencia: ventas.tendencia,
        } as KpiSucursalResumen;
      })
    );

    return resultados;
  }

  // ─── Fetch helpers ────────────────────────────────────────────────────────

  private async fetchPedidosPagados(params: {
    fecha_inicio: string;
    fecha_fin: string;
    id_sucursal?: number;
  }) {
    let query = supabase
      .from('pedido')
      .select('id_pedido, total, fecha_apertura, id_sucursal, id_sucursal_tipo_orden')
      .eq('estado_financiero', 'PAGADO')
      .gte('fecha_apertura', params.fecha_inicio)
      .lte('fecha_apertura', params.fecha_fin);

    if (params.id_sucursal !== undefined) {
      query = query.eq('id_sucursal', params.id_sucursal);
    }

    const { data, error } = await query;
    if (error) throw new AppError('Error al obtener pedidos', 500);
    return (data ?? []) as Array<{
      id_pedido: number;
      total: number;
      fecha_apertura: string;
      id_sucursal: number;
      id_sucursal_tipo_orden: number | null;
    }>;
  }

  private async fetchPagosPedido(ids: number[]) {
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from('pago_pedido')
      .select('id_pedido, id_metodo_pago, monto, propina, tipo_pago:tipo_pago!id_metodo_pago(id_tipo_pago, nombre)')
      .in('id_pedido', ids);

    if (error) throw new AppError('Error al obtener pagos', 500);
    return (data ?? []) as unknown as Array<{
      id_pedido: number;
      id_metodo_pago: number;
      monto: number;
      propina: number | null;
      tipo_pago: { id_tipo_pago: number; nombre: string } | null;
    }>;
  }

  private async fetchDetallesPedido(ids: number[]) {
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from('pedido_producto')
      .select('id_pedido, id_producto, cantidad, subtotal, producto:producto!id_producto(id_producto, nombre, categoria:categoria!id_categoria(nombre))')
      .in('id_pedido', ids)
      .neq('estado_linea', 'CANCELADO');

    if (error) throw new AppError('Error al obtener detalles', 500);
    return (data ?? []) as unknown as Array<{
      id_pedido: number;
      id_producto: number;
      cantidad: number;
      subtotal: number;
      producto: { id_producto: number; nombre: string; categoria: { nombre: string } | null } | null;
    }>;
  }

  private async fetchTiposOrden(idsSucursalTipoOrden: number[]) {
    if (idsSucursalTipoOrden.length === 0) return new Map<number, { id_tipo_orden: number; nombre: string }>();
    const { data, error } = await supabase
      .from('sucursal_tipo_orden')
      .select('id_sucursal_tipo_orden, tipo_orden:tipo_orden!id_tipo_orden(id_tipo_orden, nombre)')
      .in('id_sucursal_tipo_orden', idsSucursalTipoOrden);

    if (error) return new Map<number, { id_tipo_orden: number; nombre: string }>();

    const map = new Map<number, { id_tipo_orden: number; nombre: string }>();
    for (const row of (data ?? []) as any[]) {
      if (row.tipo_orden) {
        map.set(row.id_sucursal_tipo_orden, {
          id_tipo_orden: row.tipo_orden.id_tipo_orden,
          nombre: row.tipo_orden.nombre,
        });
      }
    }
    return map;
  }

  // ─── Agregación ───────────────────────────────────────────────────────────

  private calcularResumen(
    pedidos: Array<{ total: number }>,
    pagos: Array<{ propina: number | null }>,
  ): KpiResumen {
    const total_ventas = pedidos.reduce((s, p) => s + Number(p.total ?? 0), 0);
    const total_pedidos = pedidos.length;
    const ticket_promedio = total_pedidos > 0 ? total_ventas / total_pedidos : 0;
    const total_propinas = pagos.reduce((s, p) => s + Number(p.propina ?? 0), 0);

    return {
      total_ventas: Math.round(total_ventas * 100) / 100,
      total_pedidos,
      ticket_promedio: Math.round(ticket_promedio * 100) / 100,
      total_propinas: Math.round(total_propinas * 100) / 100,
    };
  }

  private agruparPorMetodoPago(
    pagos: Array<{ id_metodo_pago: number; monto: number; tipo_pago: { id_tipo_pago: number; nombre: string } | null }>,
    totalVentas: number,
  ): KpiMetodoPago[] {
    const map = new Map<number, KpiMetodoPago>();

    for (const pago of pagos) {
      const id = pago.id_metodo_pago;
      const nombre = pago.tipo_pago?.nombre ?? 'Desconocido';
      const monto = Number(pago.monto ?? 0);

      if (!map.has(id)) {
        map.set(id, { id_tipo_pago: id, nombre, total: 0, cantidad: 0, porcentaje: 0 });
      }
      const entry = map.get(id)!;
      entry.total += monto;
      entry.cantidad += 1;
    }

    return [...map.values()]
      .map(e => ({
        ...e,
        total: Math.round(e.total * 100) / 100,
        porcentaje: totalVentas > 0 ? Math.round((e.total / totalVentas) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  private agruparPorTipoOrden(
    pedidos: Array<{ id_sucursal_tipo_orden: number | null; total: number }>,
    tiposOrdenMap: Map<number, { id_tipo_orden: number; nombre: string }>,
    totalVentas: number,
  ): KpiTipoOrden[] {
    const map = new Map<number, KpiTipoOrden>();

    for (const pedido of pedidos) {
      const rel = pedido.id_sucursal_tipo_orden
        ? tiposOrdenMap.get(pedido.id_sucursal_tipo_orden)
        : null;
      const id = rel?.id_tipo_orden ?? 0;
      const nombre = rel?.nombre ?? 'Sin clasificar';
      const total = Number(pedido.total ?? 0);

      if (!map.has(id)) {
        map.set(id, { id_tipo_orden: id, nombre, total: 0, cantidad: 0, porcentaje: 0 });
      }
      const entry = map.get(id)!;
      entry.total += total;
      entry.cantidad += 1;
    }

    return [...map.values()]
      .map(e => ({
        ...e,
        total: Math.round(e.total * 100) / 100,
        porcentaje: totalVentas > 0 ? Math.round((e.total / totalVentas) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  private agruparTopProductos(
    detalles: Array<{
      id_producto: number;
      cantidad: number;
      subtotal: number;
      producto: { id_producto: number; nombre: string; categoria: { nombre: string } | null } | null;
    }>,
  ): KpiProducto[] {
    const map = new Map<number, KpiProducto>();

    for (const det of detalles) {
      if (!det.producto) continue;
      const id = det.id_producto;
      const nombre = det.producto.nombre;
      const categoria = det.producto.categoria?.nombre ?? 'Sin categoría';

      if (!map.has(id)) {
        map.set(id, { id_producto: id, nombre, categoria, cantidad: 0, total: 0 });
      }
      const entry = map.get(id)!;
      entry.cantidad += Number(det.cantidad ?? 0);
      entry.total += Number(det.subtotal ?? 0);
    }

    return [...map.values()]
      .map(e => ({ ...e, total: Math.round(e.total * 100) / 100 }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);
  }

  private calcularTendencia(
    pedidos: Array<{ fecha_apertura: string; total: number }>,
    fecha_inicio: string,
    fecha_fin: string,
  ): KpiTendencia[] {
    // Agrupar por día
    const map = new Map<string, KpiTendencia>();

    for (const p of pedidos) {
      const fecha = p.fecha_apertura.toString().slice(0, 10);
      if (!map.has(fecha)) {
        map.set(fecha, { fecha, total: 0, cantidad: 0 });
      }
      const entry = map.get(fecha)!;
      entry.total += Number(p.total ?? 0);
      entry.cantidad += 1;
    }

    // Rellenar días vacíos dentro del rango para que la línea no tenga huecos
    const inicio = new Date(fecha_inicio);
    const fin = new Date(fecha_fin);
    const resultado: KpiTendencia[] = [];
    const cursor = new Date(inicio);

    while (cursor <= fin) {
      const key = cursor.toISOString().slice(0, 10);
      const entry = map.get(key);
      resultado.push({
        fecha: key,
        total: entry ? Math.round(entry.total * 100) / 100 : 0,
        cantidad: entry?.cantidad ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return resultado;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private respuestaVacia(fecha_inicio: string, fecha_fin: string): KpiVentasResponse {
    const tendencia = this.calcularTendencia([], fecha_inicio, fecha_fin);
    return {
      resumen: { total_ventas: 0, total_pedidos: 0, ticket_promedio: 0, total_propinas: 0 },
      por_metodo_pago: [],
      por_tipo_orden: [],
      top_productos: [],
      tendencia,
    };
  }
}
