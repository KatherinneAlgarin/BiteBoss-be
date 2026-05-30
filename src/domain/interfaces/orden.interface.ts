export type TipoOrden = string;
export type EstadoOperativo = 'NUEVO' | 'EN_PROCESO' | 'ENTREGADO' | 'CANCELADO';
export type EstadoFinanciero = 'SIN_PAGAR' | 'PAGADO' | 'REEMBOLSADO';

export interface OrdenDto {
  id_pedido?: number;
  id_usuario: number;
  total: number;
  id_sucursal_tipo_orden: number;
  id_sucursal: number;
  estado_operativo: EstadoOperativo;
  estado_financiero: EstadoFinanciero;
  fecha_apertura: Date;
  nombre_cliente: string;
  apellido_cliente: string;
  numero_orden?: string; // Calculated field
  tipo_orden?: TipoOrden; // From join
  mesa_numero?: number; // From join
}

export interface OrdenDetalleDto {
  id_pedido_producto?: number;
  id_pedido: number;
  id_producto: number;
  id_usuario_agrega: number;
  creado_en?: Date;
  id_usuario_entrega?: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  estado_linea: string; // 'PENDIENTE', 'ENTREGADO', 'CANCELADO'
  entregado_en?: Date;
  cancelado_en?: Date;
  nota?: string;
  nombre_producto?: string; // From join
}

export interface OrdenListItem {
  id_pedido: number;
  numero_orden: string;
  tipo_orden: TipoOrden;
  estado_operativo: EstadoOperativo;
  total: number;
  fecha_apertura: Date;
  fecha_cerrado?: Date | null;
  usuario_nombre?: string;
  mesa_numero?: number;
  nombre_cliente: string;
  apellido_cliente?: string;
  detalles?: Array<{
    id_producto: number;
    nombre_producto?: string;
    cantidad: number;
    nota?: string;
  }>;
}

export interface CrearOrdenDetalleDto {
  id_producto: number;
  cantidad: number;
  nota?: string;
}

export interface CrearOrdenDto {
  id_sucursal: number;
  tipo_orden: string;
  id_mesa?: number;
  nombre_cliente: string;
  apellido_cliente: string;
  detalles: CrearOrdenDetalleDto[];
}

export interface ActualizarOrdenDto {
  tipo_orden?: TipoOrden;
  id_mesa?: number;
  estado_operativo?: EstadoOperativo;
  nombre_cliente?: string;
  apellido_cliente?: string;
}

export interface ActualizarOrdenDetalleDto {
  cantidad?: number;
  nota?: string;
  estado_linea?: string;
}