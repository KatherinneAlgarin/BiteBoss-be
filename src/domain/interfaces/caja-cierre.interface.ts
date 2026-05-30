export type EstadoCajaSesion = 'ABIERTA' | 'PENDIENTE' | 'AUTORIZADA' | 'RECHAZADA';

export interface CajaTransaccionResumen {
  id_pago_pedido: number;
  id_pedido: number;
  metodo: string;
  monto: number;
  propina: number;
  referencia?: string;
}

export interface CajaMetodoResumen {
  metodo: string;
  total: number;
  cantidad: number;
}

export interface CajaProductoResumen {
  id_producto: number;
  nombre_producto: string;
  cantidad_total: number;
  total_vendido: number;
}

export interface CajaResumen {
  id_caja_sesion: number;
  estado: EstadoCajaSesion;
  fecha_apertura: string;
  fecha_solicitud_cierre?: string | null;
  total_transacciones: number;
  total_monto: number;
  total_propina: number;
  por_metodo: CajaMetodoResumen[];
  productos: CajaProductoResumen[];
  transacciones: CajaTransaccionResumen[];
}

export interface SolicitarCierreCajaDto {
  codigo_empleado: string;
  observacion?: string;
  monto_declarado: number;
}

export interface CajaCierreListadoItem {
  id_caja_sesion: number;
  estado: EstadoCajaSesion;
  fecha_apertura: string;
  fecha_solicitud_cierre?: string | null;
  fecha_resolucion?: string | null;
  id_sucursal: number;
  sucursal_nombre?: string;
  id_usuario_cajero: number;
  cajero_nombre?: string;
  id_usuario_revisor?: number | null;
  revisor_nombre?: string | null;
  total_transacciones: number;
  total_monto: number;
  total_propina: number;
  monto_declarado?: number | null;
  observacion_solicitud?: string | null;
  motivo_rechazo?: string | null;
  resumen?: CajaResumen | null;
}

export interface CajeroSesionActivaItem {
  id_usuario_cajero: number;
  cajero_nombre: string;
  id_sucursal: number;
  id_caja_sesion: number;
  fecha_apertura: string;
}
