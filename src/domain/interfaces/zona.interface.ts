export interface ZonaItem {
  id_zona: number;
  id_sucursal: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface CrearZonaDto {
  id_sucursal: number;
  nombre: string;
  descripcion?: string | null;
}

export interface ActualizarZonaDto {
  nombre?: string;
  descripcion?: string | null;
}
