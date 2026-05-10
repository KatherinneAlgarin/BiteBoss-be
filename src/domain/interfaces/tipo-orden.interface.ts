export interface TipoOrdenDto {
  id_tipo_orden?: number;
  nombre: string;
  id_tipo_orden_padre: number | null;
  requiere_mesa: boolean;
}

export interface CrearTipoOrdenDto {
  nombre: string;
  id_tipo_orden_padre?: number | null;
  requiere_mesa?: boolean;
}

export interface ActualizarTipoOrdenDto {
  nombre?: string;
  id_tipo_orden_padre?: number | null;
  requiere_mesa?: boolean;
}

export interface TipoOrdenListItem {
  id_tipo_orden: number;
  nombre: string;
  id_tipo_orden_padre: number | null;
  nombre_padre: string | null;
  requiere_mesa: boolean;
}

export interface DependenciasTipoOrden {
  subtipos: { id_tipo_orden: number; nombre: string }[];
  sucursales_asignadas: { id_sucursal: number; nombre: string }[];
  puede_eliminar: boolean;
}
