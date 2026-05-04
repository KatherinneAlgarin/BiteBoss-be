export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthPayload {
  id_usuario: number;
  nombre: string;
  email: string;
  id_usuario_sucursal: number;
  id_rol: number;
  rol: string;
  id_sucursal: number;
  sucursal: string;
}

export interface AuthResponse {
  token: string;
  usuario: AuthPayload;
}
