export interface InventarioStockActualItem {
  id_producto: number;
  nombre_producto: string;
  stock_actual: number;
  unidad_medida: string;
  stock_minimo: number;
  en_alerta: boolean;
}

export interface InventarioIngredienteItem {
  id_inventario: number;
  id_ingrediente: number;
  nombre_ingrediente: string;
  unidad_medida: string;
  id_bodega: number;
  nombre_bodega: string;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo: number;
  lote: string | null;
  fecha_vencimiento: string | null;
  en_alerta: boolean;
  proxima_vencer: boolean;
  vencido: boolean;
}

export interface RegistrarStockIngredienteDto {
  id_ingrediente: number;
  id_bodega: number;
  cantidad: number;
  stock_minimo: number;
  stock_maximo: number;
  lote?: string;
  fecha_vencimiento?: string;
}

export interface AjusteStockDto {
  tipo: 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO';
  cantidad: number;
  lote?: string;
  fecha_vencimiento?: string;
}

export interface ActualizarLimitesDto {
  stock_minimo: number;
  stock_maximo: number;
}

export interface TransferirStockDto {
  id_bodega_destino: number;
  cantidad: number;
}
