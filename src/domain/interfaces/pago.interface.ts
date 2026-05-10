export type EstadoPago = 'pendiente' | 'confirmado' | 'rechazado' | 'reembolsado';

export interface PagoDto {
  id_pago?: number;
  id_orden: number;
  monto: number;
  metodo: string;
  referencia?: string;
  propina?: number;
  estado: EstadoPago;
  fecha_pago: Date;
}

export interface MetodoPagoSucursalDto {
  id_metodo_pago_sucursal?: number;
  id_sucursal: number;
  metodo: string;
  activo: boolean;
  descripcion?: string;
}

export interface CrearPagoDto {
  id_orden: number;
  monto: number;
  metodo: string;
  referencia?: string;
  propina?: number;
}
