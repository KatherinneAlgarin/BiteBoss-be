export interface InventarioStockActualItem {
  id_producto: number;
  nombre_producto: string;
  stock_actual: number;
  unidad_medida: string;
  stock_minimo: number;
  en_alerta: boolean;
}
