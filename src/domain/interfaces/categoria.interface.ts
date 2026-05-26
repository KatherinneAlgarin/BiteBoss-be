export interface CategoriaItem {
  id_categoria: number;
  nombre: string;
  activo: boolean;
  creado_en: string;
  cantidad_sucursales: number;
}

export interface CrearCategoriaDto {
  nombre: string;
}

export interface ActualizarCategoriaDto {
  nombre?: string;
}

export interface ProductosActivosCategoria {
  cantidad: number;
}
