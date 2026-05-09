export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'billetera';
export type EstadoPago = 'pendiente' | 'confirmado' | 'rechazado' | 'reembolsado';

export interface PagoDto {
  id_pago?: number;
  id_orden: number;
  monto: number;
  metodo: MetodoPago;
  referencia?: string;
  propina?: number;
  estado: EstadoPago;
  fecha_pago: Date;
}

export interface MetodoPagoSucursalDto {
  id_metodo_pago_sucursal?: number;
  id_sucursal: number;
  metodo: MetodoPago;
  activo: boolean;
  descripcion?: string;
}

export interface CrearPagoDto {
  id_orden: number;
  monto: number;
  metodo: MetodoPago;
  referencia?: string;
  propina?: number;
}