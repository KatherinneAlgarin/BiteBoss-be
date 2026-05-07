export interface LoginDto {
  email: string;
  password: string;
}

export interface OlvidarContrasenaDto {
  email: string;
}

export interface AuthPayload {
  auth_id: string;// UUID de Supabase (sub)
  id_usuario?: number; // desde app_metadata
  nombre?: string;
  email: string;
  id_usuario_sucursal?: number;
  id_rol?: number;
  rol: string;
  id_sucursal: number;
  sucursal?: string;
}

export interface AuthResponse {
  token: string;
  usuario: AuthPayload;
}
