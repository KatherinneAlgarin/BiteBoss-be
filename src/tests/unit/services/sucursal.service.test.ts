import { SucursalService } from '../../../services/sucursal.service';
import { createSupabaseMock } from '../../mocks/supabase.mock';
import { AppError } from '../../../helpers/app-error';

jest.mock('../../../config/supabase');
jest.mock('../../../domain/constants/pedido', () => ({
  ESTADOS_PEDIDO_TERMINALES: ['CANCELADO', 'ENTREGADO'],
}));

describe('SucursalService', () => {
  let sucursalService: SucursalService;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createSupabaseMock();
    const supabaseModule = require('../../../config/supabase');
    supabaseModule.default = mockSupabase;
    sucursalService = new SucursalService();
  });

  const sucursalBase = {
    id_sucursal: 1,
    nombre: 'Sucursal Centro',
    direccion: 'Av. Principal 123',
    activo: true,
  };

  const sucursalDetalle = {
    ...sucursalBase,
    tipos_orden: [{ id_tipo_orden: 1, nombre: 'Para llevar' }],
    tipos_pago: [{ id_tipo_pago: 1, nombre: 'EFECTIVO' }],
  };

  describe('listar', () => {

    // ✅ CASOS CORRECTOS
    it('debería listar todas las sucursales (sin filtro)', async () => {
      // from().select().order() -> order() devuelve queryBuilder -> mockResult
      mockSupabase.from().mockResult({ data: [sucursalBase], error: null });

      const resultado = await sucursalService.listar();

      expect(resultado).toHaveLength(1);
      expect(resultado[0].nombre).toBe('Sucursal Centro');
    });

    it('debería listar solo sucursales activas cuando soloActivas=true', async () => {
      // from().select().order().eq() -> eq() devuelve queryBuilder -> mockResult
      mockSupabase.from().mockResult({ data: [sucursalBase], error: null });

      const resultado = await sucursalService.listar(true);

      expect(resultado).toHaveLength(1);
    });

    it('debería retornar array vacío si no hay sucursales', async () => {
      mockSupabase.from().mockResult({ data: null, error: null });

      const resultado = await sucursalService.listar();

      expect(resultado).toEqual([]);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si falla la consulta', async () => {
      mockSupabase.from().mockResult({ data: null, error: { message: 'Error de BD' } });

      await expect(sucursalService.listar()).rejects.toThrow(
        new AppError('Error al listar sucursales', 500)
      );
    });
  });

  describe('obtenerPorId', () => {

    // ✅ CASOS CORRECTOS
    it('debería retornar la sucursal con sus tipos si existe', async () => {
      // 1. from('sucursal').select().eq().maybeSingle()
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: sucursalBase,
        error: null,
      });
      // 2. obtenerTiposOrdenVinculados: from().select().eq().eq().eq() -> await -> mockResult
      mockSupabase.from().mockResult({
        data: [{ tipo_orden: { id_tipo_orden: 1, nombre: 'Para llevar' } }],
        error: null,
      });
      // 3. obtenerTiposPagoVinculados: from().select().eq().eq().eq() -> await -> mockResult
      mockSupabase.from().mockResult({
        data: [{ tipo_pago: { id_tipo_pago: 1, nombre: 'EFECTIVO' } }],
        error: null,
      });

      const resultado = await sucursalService.obtenerPorId(1);

      expect(resultado).not.toBeNull();
      expect(resultado?.nombre).toBe('Sucursal Centro');
      expect(resultado?.tipos_orden).toHaveLength(1);
      expect(resultado?.tipos_pago).toHaveLength(1);
    });

    it('debería retornar null si la sucursal no existe', async () => {
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const resultado = await sucursalService.obtenerPorId(999);

      expect(resultado).toBeNull();
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si hay error de BD', async () => {
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error de BD' },
      });

      await expect(sucursalService.obtenerPorId(1)).rejects.toThrow(
        new AppError('Error al obtener sucursal', 500)
      );
    });
  });

  describe('crear', () => {

    const crearDto = {
      nombre: 'Sucursal Norte',
      direccion: 'Calle 5',
      tipos_orden: [1],
      tipos_pago: [1],
    };

    // ✅ CASOS CORRECTOS
    it('debería crear una sucursal exitosamente', async () => {
      // 1. existeNombreCI: from().select().ilike() -> await -> mockResult (no duplicado)
      mockSupabase.from().mockResult({ data: [], error: null });
      // 2. insert sucursal: from().insert().select().single()
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id_sucursal: 2 },
        error: null,
      });
      // 3. reemplazarTiposOrden -> get existing: from().select().eq() -> mockResult
      mockSupabase.from().mockResult({ data: [], error: null });
      // 4. reemplazarTiposOrden -> insert new: from().insert() -> await -> mockResult
      mockSupabase.from().mockResult({ data: null, error: null });
      // 5. reemplazarTiposPago -> get existing: from().select().eq() -> mockResult
      mockSupabase.from().mockResult({ data: [], error: null });
      // 6. reemplazarTiposPago -> insert new: from().insert() -> await -> mockResult
      mockSupabase.from().mockResult({ data: null, error: null });
      // 7. obtenerPorId -> sucursal: maybeSingle
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: { id_sucursal: 2, nombre: 'Sucursal Norte', direccion: 'Calle 5', activo: true },
        error: null,
      });
      // 8. obtenerTiposOrdenVinculados -> mockResult
      mockSupabase.from().mockResult({
        data: [{ tipo_orden: { id_tipo_orden: 1, nombre: 'Para llevar' } }],
        error: null,
      });
      // 9. obtenerTiposPagoVinculados -> mockResult
      mockSupabase.from().mockResult({
        data: [{ tipo_pago: { id_tipo_pago: 1, nombre: 'EFECTIVO' } }],
        error: null,
      });

      const resultado = await sucursalService.crear(crearDto);

      expect(resultado.nombre).toBe('Sucursal Norte');
      expect(resultado.tipos_orden).toHaveLength(1);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si el nombre ya existe', async () => {
      // existeNombreCI -> hay duplicado
      mockSupabase.from().mockResult({ data: [{ id_sucursal: 5 }], error: null });

      await expect(sucursalService.crear(crearDto)).rejects.toThrow(
        new AppError('Ya existe una sucursal con ese nombre', 409)
      );
    });
  });

  describe('desactivar', () => {

    // ✅ CASOS CORRECTOS
    it('debería desactivar una sucursal sin usuarios activos ni zonas', async () => {
      // 1. tieneUsuariosActivos -> contarUsuariosActivos: from().select().eq() -> await -> mockResult
      mockSupabase.from().mockResult({ data: [], error: null }); // sin usuarios
      // 2. listarZonasDeSucursal: from().select().eq() -> await -> mockResult
      mockSupabase.from().mockResult({ data: [], error: null }); // sin zonas
      // 3. update: from().update().eq().select().single()
      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: { ...sucursalBase, activo: false },
        error: null,
      });

      const resultado = await sucursalService.desactivar(1);

      expect(resultado.activo).toBe(false);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si tiene usuarios activos', async () => {
      // contarUsuariosActivos -> hay usuarios activos
      mockSupabase.from().mockResult({
        data: [{ usuario: { activo: true } }],
        error: null,
      });

      await expect(sucursalService.desactivar(1)).rejects.toThrow(
        new AppError('No se puede desactivar: la sucursal tiene información activa asociada.', 409)
      );
    });
  });

  describe('activar', () => {

    // ✅ CASOS CORRECTOS
    it('debería activar una sucursal', async () => {
      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: sucursalBase,
        error: null,
      });

      const resultado = await sucursalService.activar(1);

      expect(resultado.activo).toBe(true);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si falla la activación', async () => {
      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error de BD' },
      });

      await expect(sucursalService.activar(1)).rejects.toThrow(
        new AppError('Error al activar la sucursal', 500)
      );
    });
  });
});
