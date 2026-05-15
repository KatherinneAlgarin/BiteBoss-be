import { ProveedorService } from '../../../services/proveedor.service';
import { createSupabaseMock } from '../../mocks/supabase.mock';
import { AppError } from '../../../helpers/app-error';

jest.mock('../../../config/supabase');

describe('ProveedorService', () => {
  let proveedorService: ProveedorService;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createSupabaseMock();
    const supabaseModule = require('../../../config/supabase');
    supabaseModule.default = mockSupabase;
    proveedorService = new ProveedorService();
  });

  const proveedorBase = {
    id_proveedor: 1,
    nombre: 'Distribuidora ABC',
    email: 'abc@proveedor.com',
    telefono: '1234-5678',
    direccion: 'Calle Principal',
    activo: true,
    creado_en: '2024-01-01',
  };

  describe('listarProveedores', () => {

    // ✅ CASOS CORRECTOS
    it('debería listar proveedores activos', async () => {
      // from().select().eq().order() -> order() devuelve queryBuilder -> mockResult
      mockSupabase.from().mockResult({ data: [proveedorBase], error: null });

      const resultado = await proveedorService.listarProveedores();

      expect(resultado).toHaveLength(1);
      expect(resultado[0].nombre).toBe('Distribuidora ABC');
    });

    it('debería retornar array vacío si no hay proveedores', async () => {
      mockSupabase.from().mockResult({ data: null, error: null });

      const resultado = await proveedorService.listarProveedores();

      expect(resultado).toEqual([]);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si falla la consulta', async () => {
      mockSupabase.from().mockResult({ data: null, error: { message: 'Error de BD' } });

      await expect(proveedorService.listarProveedores()).rejects.toThrow(
        new AppError('Error al listar proveedores', 500)
      );
    });
  });

  describe('obtenerProveedorPorId', () => {

    // ✅ CASOS CORRECTOS
    it('debería retornar el proveedor si existe', async () => {
      // from().select().eq().single()
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: proveedorBase,
        error: null,
      });

      const resultado = await proveedorService.obtenerProveedorPorId(1);

      expect(resultado).not.toBeNull();
      expect(resultado?.nombre).toBe('Distribuidora ABC');
    });

    it('debería retornar null si proveedor no existe (PGRST116)', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      const resultado = await proveedorService.obtenerProveedorPorId(999);

      expect(resultado).toBeNull();
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si hay error de BD', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'OTHER_ERROR', message: 'Error de BD' },
      });

      await expect(proveedorService.obtenerProveedorPorId(1)).rejects.toThrow(
        new AppError('Error al obtener proveedor', 500)
      );
    });
  });

  describe('crearProveedor', () => {

    const crearDto = {
      nombre: 'Nuevo Proveedor',
      email: 'nuevo@proveedor.com',
      activo: true,
    };

    // ✅ CASOS CORRECTOS
    it('debería crear un proveedor exitosamente', async () => {
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id_proveedor: 2, ...crearDto },
        error: null,
      });

      const resultado = await proveedorService.crearProveedor(crearDto);

      expect(resultado.nombre).toBe('Nuevo Proveedor');
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si falla la inserción', async () => {
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Violación de unicidad' },
      });

      await expect(proveedorService.crearProveedor(crearDto)).rejects.toThrow(
        new AppError('Error al crear proveedor', 500)
      );
    });
  });

  describe('actualizarProveedor', () => {

    const actualizarDto = { nombre: 'Proveedor Actualizado' };

    // ✅ CASOS CORRECTOS
    it('debería actualizar un proveedor exitosamente', async () => {
      const proveedorActualizado = { ...proveedorBase, nombre: 'Proveedor Actualizado' };

      // 1. obtenerProveedorPorId
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: proveedorBase,
        error: null,
      });
      // 2. update
      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: proveedorActualizado,
        error: null,
      });

      const resultado = await proveedorService.actualizarProveedor(1, actualizarDto);

      expect(resultado.nombre).toBe('Proveedor Actualizado');
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si el proveedor no existe', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      await expect(proveedorService.actualizarProveedor(999, actualizarDto)).rejects.toThrow(
        new AppError('Proveedor no encontrado', 404)
      );
    });

    it('debería lanzar AppError si al actualizar quedaría sin contacto', async () => {
      // Proveedor solo tiene teléfono, y el dto intenta quitar el teléfono sin poner email
      const proveedorSinEmail = { ...proveedorBase, email: undefined, telefono: '1234' };

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: proveedorSinEmail,
        error: null,
      });

      await expect(
        proveedorService.actualizarProveedor(1, { email: '', telefono: '' })
      ).rejects.toThrow(new AppError('El proveedor debe tener al menos un dato de contacto (email o teléfono)', 400));
    });

    it('debería lanzar AppError si falla el update en BD', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: proveedorBase,
        error: null,
      });
      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error de BD' },
      });

      await expect(proveedorService.actualizarProveedor(1, actualizarDto)).rejects.toThrow(
        new AppError('Error al actualizar proveedor', 500)
      );
    });
  });

  describe('eliminarProveedor', () => {

    // ✅ CASOS CORRECTOS
    it('debería marcar el proveedor como inactivo', async () => {
      // 1. obtenerProveedorPorId
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: proveedorBase,
        error: null,
      });
      // 2. update activo: false -> ends with .eq() -> mockResult
      mockSupabase.from().mockResult({ data: null, error: null });

      await expect(proveedorService.eliminarProveedor(1)).resolves.toBeUndefined();
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si el proveedor no existe', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      await expect(proveedorService.eliminarProveedor(999)).rejects.toThrow(
        new AppError('Proveedor no encontrado', 404)
      );
    });

    it('debería lanzar AppError si falla el update', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: proveedorBase,
        error: null,
      });
      mockSupabase.from().mockResult({ data: null, error: { message: 'Error de BD' } });

      await expect(proveedorService.eliminarProveedor(1)).rejects.toThrow(
        new AppError('Error al eliminar proveedor', 500)
      );
    });
  });
});
