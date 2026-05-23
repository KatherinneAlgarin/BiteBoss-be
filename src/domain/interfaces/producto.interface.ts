export interface ProductoDto {
  id_producto?: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  id_categoria: number;
  id_sucursal?: number;
  ids_sucursales?: number[];
  ingredientes?: ProductoIngredienteDto[];
  productos_combo?: ProductoComboDto[];
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
  ids_sucursales?: number[];
  es_combo?: boolean;
}

export interface ProductoIngredienteDto {
  id_ingrediente: number;
  cantidad: number;
  activo?: boolean;
  nombre_ingrediente?: string;
  unidad_medida?: string;
}

export interface ProductoSucursalItem {
  id_sucursal: number;
  activo: boolean;
}

export interface CategoriaDto {
  id_categoria?: number;
  nombre: string;
  descripcion?: string;
  id_sucursal: number;
  activo: boolean;
}

export interface ProductoComboDto {
  id_producto_hijo: number;
  cantidad: number;
  activo?: boolean;
  nombre_producto?: string;
}

export interface ProductoDependenciasDesactivacionDto {
  id_producto: number;
  tiene_pedidos_activos: boolean;
  total_pedidos_activos: number;
  mensaje_advertencia?: string;
}