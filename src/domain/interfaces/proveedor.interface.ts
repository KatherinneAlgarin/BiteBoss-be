export interface ProveedorDto {
  id_proveedor?: number;
  nombre: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  activo: boolean;
}

export interface ProveedorListItem {
  id_proveedor: number;
  nombre: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  activo: boolean;
  creado_en: string;
}
