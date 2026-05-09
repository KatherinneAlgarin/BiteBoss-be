import supabase from '../config/supabase';
import { AppError } from '../helpers/app-error';
import type { ProveedorDto, ProveedorListItem } from '../domain/interfaces/proveedor.interface';

export class ProveedorService {

  async listarProveedores(): Promise<ProveedorListItem[]> {
    const { data, error } = await supabase
      .from('proveedor')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) {
      throw new AppError('Error al listar proveedores', 500);
    }

    return (data ?? []).map(item => ({
      id_proveedor: item.id_proveedor,
      nombre: item.nombre,
      email: item.email,
      telefono: item.telefono,
      direccion: item.direccion,
      activo: item.activo,
      creado_en: item.creado_en,
    }));
  }

  async obtenerProveedorPorId(id_proveedor: number): Promise<ProveedorDto | null> {
    const { data, error } = await supabase
      .from('proveedor')
      .select('*')
      .eq('id_proveedor', id_proveedor)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No encontrado
      }
      throw new AppError('Error al obtener proveedor', 500);
    }

    return data;
  }

  async crearProveedor(dto: ProveedorDto): Promise<ProveedorDto> {
    const { data, error } = await supabase
      .from('proveedor')
      .insert(dto)
      .select()
      .single();

    if (error) {
      throw new AppError('Error al crear proveedor', 500);
    }

    return data;
  }

  async actualizarProveedor(id_proveedor: number, dto: Partial<ProveedorDto>): Promise<ProveedorDto> {
    // Primero, obtener el proveedor actual para validar el contacto
    const proveedor = await this.obtenerProveedorPorId(id_proveedor);
    if (!proveedor) {
      throw new AppError('Proveedor no encontrado', 404);
    }

    // Validar que después de la actualización, el proveedor siga teniendo al menos un contacto
    const emailActualizado = dto.email !== undefined ? dto.email : proveedor.email;
    const telefonoActualizado = dto.telefono !== undefined ? dto.telefono : proveedor.telefono;

    const tieneEmail = emailActualizado && typeof emailActualizado === 'string' && emailActualizado.trim().length > 0;
    const tieneTelefono = telefonoActualizado && typeof telefonoActualizado === 'string' && telefonoActualizado.trim().length > 0;

    if (!tieneEmail && !tieneTelefono) {
      throw new AppError('El proveedor debe tener al menos un dato de contacto (email o teléfono)', 400);
    }

    const { data, error } = await supabase
      .from('proveedor')
      .update(dto)
      .eq('id_proveedor', id_proveedor)
      .select()
      .single();

    if (error) {
      throw new AppError('Error al actualizar proveedor', 500);
    }

    return data;
  }

  async eliminarProveedor(id_proveedor: number): Promise<void> {
    const proveedor = await this.obtenerProveedorPorId(id_proveedor);
    if (!proveedor) {
      throw new AppError('Proveedor no encontrado', 404);
    }

    const { error } = await supabase
      .from('proveedor')
      .update({ activo: false })
      .eq('id_proveedor', id_proveedor);

    if (error) {
      throw new AppError('Error al eliminar proveedor', 500);
    }
  }
}
