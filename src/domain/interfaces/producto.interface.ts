export interface ProductoDto {
  id_producto?: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  id_categoria: number;
  id_sucursal: number;
  activo: boolean;
  imagen?: string;
}

export interface ProductoListItem {
  id_producto: number;
  nombre: string;
  precio: number;
  descripcion?: string;
  id_categoria: number;
  categoria_nombre?: string;
  activo: boolean;
}

export interface CategoriaDto {
  id_categoria?: number;
  nombre: string;
  descripcion?: string;
  id_sucursal: number;
  activo: boolean;
}