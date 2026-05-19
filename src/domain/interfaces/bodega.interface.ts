export type TipoBodega = 'COCINA' | 'ALMACEN' | 'CONGELADOR' | 'OTRO';

export interface BodegaItem {
  id_bodega: number;
  nombre: string;
  tipo: TipoBodega;
  descripcion: string | null;
  activo: boolean;
  id_sucursal: number;
  sucursal?: string;
}

export interface CrearBodegaDto {
  nombre: string;
  tipo: TipoBodega;
  descripcion?: string | null;
  id_sucursal: number;
}

export interface ActualizarBodegaDto {
  nombre?: string;
  tipo?: TipoBodega;
  descripcion?: string | null;
  id_sucursal?: number;
}

export interface StockBodegaResult {
  tiene_stock: boolean;
}
