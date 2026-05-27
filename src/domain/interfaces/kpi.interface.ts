export interface KpiResumen {
  total_ventas: number;
  total_pedidos: number;
  ticket_promedio: number;
  total_propinas: number;
}

export interface KpiMetodoPago {
  id_tipo_pago: number;
  nombre: string;
  total: number;
  cantidad: number;
  porcentaje: number;
}

export interface KpiTipoOrden {
  id_tipo_orden: number;
  nombre: string;
  total: number;
  cantidad: number;
  porcentaje: number;
}

export interface KpiProducto {
  id_producto: number;
  nombre: string;
  categoria: string;
  cantidad: number;
  total: number;
}

export interface KpiTendencia {
  fecha: string; // 'YYYY-MM-DD'
  total: number;
  cantidad: number;
}

export interface KpiVentasResponse {
  resumen: KpiResumen;
  por_metodo_pago: KpiMetodoPago[];
  por_tipo_orden: KpiTipoOrden[];
  top_productos: KpiProducto[];
  tendencia: KpiTendencia[];
}

export interface KpiSucursalResumen {
  id_sucursal: number;
  nombre: string;
  resumen: KpiResumen;
  top_producto: KpiProducto | null;
  metodo_predominante: KpiMetodoPago | null;
  tendencia: KpiTendencia[];
}
