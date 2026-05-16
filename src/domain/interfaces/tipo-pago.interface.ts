export interface TipoPagoItem {
  id_tipo_pago: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface CrearTipoPagoDto {
  nombre: string;
  descripcion?: string | null;
}

export interface ActualizarTipoPagoDto {
  nombre?: string;
  descripcion?: string | null;
}

export interface SucursalImpactadaTipoPago {
  id_sucursal: number;
  nombre: string;
  metodos_activos_restantes: number;
}

export interface DependenciasDesactivacionTipoPago {
  id_tipo_pago: number;
  nombre: string;
  sucursales_activas_count: number;
  sucursales_activas: SucursalImpactadaTipoPago[];
  puede_desactivar: boolean;
  sucursales_sin_metodos: SucursalImpactadaTipoPago[];
}

export interface AuditoriaTipoPagoEvento {
  entidad: 'tipo_pago';
  entidad_id: number;
  accion: 'CREAR' | 'EDITAR' | 'ACTIVAR' | 'DESACTIVAR';
  actor_id_usuario: number | null;
  actor_email: string;
  cambios: Array<{
    campo: string;
    anterior: unknown;
    nuevo: unknown;
  }>;
  timestamp: string;
}
