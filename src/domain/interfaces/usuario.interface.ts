export interface CrearUsuarioDto {
  nombre: string;
  email: string;
  password: string;
  id_rol: number;
  id_sucursal: number;
}

export interface UsuarioListItem {
  id_usuario: number;
  nombre: string;
  email: string;
  activo: boolean;
  rol: string;
  id_rol: number;
  sucursal: string;
  id_sucursal: number;
  id_usuario_sucursal: number;
}

export interface RolItem {
  id_rol: number;
  nombre: string;
}

export interface SucursalItem {
  id_sucursal: number;
  nombre: string;
}

export interface UsuarioCreadoResponse {
  id_usuario: number;
  nombre: string;
  email: string;
  rol: string;
  sucursal: string;
}
