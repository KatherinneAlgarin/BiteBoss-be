export interface SucursalItem {
  id_sucursal: number;
  nombre: string;
  direccion: string | null;
  activo: boolean;
}

export interface SucursalDetalle extends SucursalItem {
  tipos_orden: { id_tipo_orden: number; nombre: string }[];
  tipos_pago: { id_tipo_pago: number; nombre: string }[];
}

export interface CrearSucursalDto {
  nombre: string;
  direccion?: string | null;
  tipos_orden: number[];
  tipos_pago: number[];
}

export interface ActualizarSucursalDto {
  nombre?: string;
  direccion?: string | null;
  tipos_orden?: number[];
  tipos_pago?: number[];
}
