export type EstadoReservacion = 'pendiente' | 'cancelada' | 'completada';

export interface ActualizarReservacionDto {
  nombre_cliente?: string;
  telefono?: string | null;
  email?: string | null;
  fecha_llegada?: string;
  cantidad_personas?: number;
  id_zona?: number;
  id_mesa?: number;
}

export interface CrearReservacionDto {
  nombre_cliente: string;
  telefono?: string | null;
  email?: string | null;
  fecha_llegada: string;
  cantidad_personas: number;
  id_zona: number;
  id_mesa: number;
}

export interface ReservacionItem {
  id_reservacion: number;
  nombre_cliente: string;
  telefono: string | null;
  email: string | null;
  fecha_llegada: string;
  cantidad_personas: number;
  id_zona: number;
  zona_nombre: string;
  id_mesa: number;
  mesa_numero: number;
  id_sucursal: number;
  id_usuario_sucursal: number;
  estado: EstadoReservacion;
  activo: boolean;
  creado_en: string;
}
