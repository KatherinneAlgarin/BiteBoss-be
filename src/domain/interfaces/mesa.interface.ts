export interface MesaItem {
  id_mesa: number;
  id_zona: number;
  numero: number;
  capacidad: number;
  activo: boolean;
}

export interface CrearMesaDto {
  id_zona: number;
  numero: number;
  capacidad: number;
}

export interface ActualizarMesaDto {
  id_zona?: number;
  numero?: number;
  capacidad?: number;
}
