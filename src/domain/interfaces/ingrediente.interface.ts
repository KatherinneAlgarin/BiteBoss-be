export interface IngredienteItem {
  id_ingrediente: number;
  nombre: string;
  unidad_medida: string;
  activo: boolean;
}

export interface StockInicialDto {
  id_bodega: number;
  cantidad: number;
  stock_minimo: number;
  stock_maximo: number;
}

export interface CrearIngredienteDto {
  nombre: string;
  unidad_medida: string;
  stock_inicial?: StockInicialDto;
}

export interface ActualizarIngredienteDto {
  nombre?: string;
  unidad_medida?: string;
}

export interface EnUsoIngrediente {
  en_uso: boolean;
  productos: string[];
}
