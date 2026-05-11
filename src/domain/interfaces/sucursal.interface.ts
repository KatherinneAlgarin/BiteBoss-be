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

export interface DependenciasSucursal {
  usuarios_activos: number;
  zonas_asociadas: { id_zona: number; nombre: string }[];
  mesas_asociadas: number;
  puede_desactivar: boolean;
  requiere_eliminar_zonas: boolean;
}
