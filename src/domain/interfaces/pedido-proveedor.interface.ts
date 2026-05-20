export interface PedidoProveedorDetalleItem {
  id_pedido_proveedor_detalle: number;
  id_ingrediente: number;
  nombre_ingrediente: string;
  unidad_medida: string;
  cantidad: number;
  precio_unitario: number | null;
  creado_en: string;
}

export interface PedidoProveedorItem {
  id_pedido_proveedor: number;
  id_proveedor: number;
  nombre_proveedor: string;
  id_sucursal: number;
  nombre_sucursal: string;
  id_usuario_sucursal: number;
  fecha_pedido: string;
  fecha_entrega: string | null;
  estado: 'PENDIENTE' | 'RECIBIDO' | 'CANCELADO';
  monto_total: number;
  detalles?: PedidoProveedorDetalleItem[];
}

export interface CrearPedidoDetalleDto {
  id_ingrediente: number;
  cantidad: number;
  precio_unitario: number;
}

export interface CrearPedidoProveedorDto {
  id_proveedor: number;
  id_sucursal: number;
  fecha_entrega?: string;
  detalles: CrearPedidoDetalleDto[];
}

export interface EditarPedidoProveedorDto {
  fecha_entrega?: string | null;
  estado?: 'PENDIENTE' | 'RECIBIDO' | 'CANCELADO';
  detalles?: CrearPedidoDetalleDto[];
}
