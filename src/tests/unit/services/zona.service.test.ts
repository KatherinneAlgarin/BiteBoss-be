import { ZonaService } from '../../../services/zona.service';
import { createSupabaseMock } from '../../mocks/supabase.mock';
import { AppError } from '../../../helpers/app-error';

jest.mock('../../../config/supabase');

describe('ZonaService', () => {
  let zonaService: ZonaService;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createSupabaseMock();
    const supabaseModule = require('../../../config/supabase');
    supabaseModule.default = mockSupabase;
    zonaService = new ZonaService();
  });

  const zonaBase = {
    id_zona: 1,
    id_sucursal: 1,
    nombre: 'Terraza',
    descripcion: 'Zona al aire libre',
    activo: true,
  };

  describe('listarPorSucursal', () => {

    // ✅ CASOS CORRECTOS
    it('debería listar zonas de una sucursal', async () => {
      // from().select().eq().order() -> order() devuelve queryBuilder -> mockResult
      mockSupabase.from().mockResult({ data: [zonaBase], error: null });

      const resultado = await zonaService.listarPorSucursal(1);

      expect(resultado).toHaveLength(1);
      expect(resultado[0].nombre).toBe('Terraza');
    });

    it('debería retornar array vacío si no hay zonas', async () => {
      mockSupabase.from().mockResult({ data: null, error: null });

      const resultado = await zonaService.listarPorSucursal(1);

      expect(resultado).toEqual([]);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si falla la consulta', async () => {
      mockSupabase.from().mockResult({ data: null, error: { message: 'Error de BD' } });

      await expect(zonaService.listarPorSucursal(1)).rejects.toThrow(
        new AppError('Error al listar zonas', 500)
      );
    });
  });

  describe('obtenerPorId', () => {

    // ✅ CASOS CORRECTOS
    it('debería retornar la zona si existe', async () => {
      // from().select().eq().maybeSingle()
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: zonaBase,
        error: null,
      });

      const resultado = await zonaService.obtenerPorId(1);

      expect(resultado).not.toBeNull();
      expect(resultado?.nombre).toBe('Terraza');
    });

    it('debería retornar null si la zona no existe', async () => {
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const resultado = await zonaService.obtenerPorId(999);

      expect(resultado).toBeNull();
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si hay error de BD', async () => {
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error de BD' },
      });

      await expect(zonaService.obtenerPorId(1)).rejects.toThrow(
        new AppError('Error al obtener zona', 500)
      );
    });
  });

  describe('crear', () => {

    const crearDto = { id_sucursal: 1, nombre: 'Terraza', descripcion: null };

    // ✅ CASOS CORRECTOS
    it('debería crear una zona exitosamente', async () => {
      // 1. existeSucursal: from().select().eq().maybeSingle()
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: { id_sucursal: 1 },
        error: null,
      });
      // 2. existeNombreEnSucursal: from().select().eq().ilike() -> await -> mockResult (sin duplicado)
      mockSupabase.from().mockResult({ data: [], error: null });
      // 3. insert: from().insert().select().single()
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: zonaBase,
        error: null,
      });

      const resultado = await zonaService.crear(crearDto);

      expect(resultado.nombre).toBe('Terraza');
      expect(resultado.id_sucursal).toBe(1);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si la sucursal no existe', async () => {
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(zonaService.crear(crearDto)).rejects.toThrow(
        new AppError('La sucursal indicada no existe', 400)
      );
    });

    it('debería lanzar AppError si ya existe una zona con ese nombre', async () => {
      // 1. existeSucursal -> existe
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: { id_sucursal: 1 },
        error: null,
      });
      // 2. existeNombreEnSucursal -> ya existe
      mockSupabase.from().mockResult({ data: [{ id_zona: 5 }], error: null });

      await expect(zonaService.crear(crearDto)).rejects.toThrow(
        new AppError('Ya existe una zona con ese nombre en esta sucursal', 409)
      );
    });
  });

  describe('actualizar', () => {

    const actualizarDto = { nombre: 'Nuevo Nombre' };

    // ✅ CASOS CORRECTOS
    it('debería actualizar una zona exitosamente', async () => {
      const zonaActualizada = { ...zonaBase, nombre: 'Nuevo Nombre' };

      // 1. obtenerPorId (zona actual)
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: zonaBase,
        error: null,
      });
      // 2. existeNombreEnSucursal (nombre diferente -> verificar)
      mockSupabase.from().mockResult({ data: [], error: null });
      // 3. update -> from().update().eq() -> ends with eq() -> mockResult
      mockSupabase.from().mockResult({ data: null, error: null });
      // 4. obtenerPorId (zona actualizada)
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: zonaActualizada,
        error: null,
      });

      const resultado = await zonaService.actualizar(1, actualizarDto);

      expect(resultado.nombre).toBe('Nuevo Nombre');
    });

    it('debería retornar la zona sin cambios si el dto está vacío', async () => {
      // 1. obtenerPorId
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: zonaBase,
        error: null,
      });

      const resultado = await zonaService.actualizar(1, {});

      expect(resultado.nombre).toBe('Terraza');
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si la zona no existe', async () => {
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(zonaService.actualizar(999, actualizarDto)).rejects.toThrow(
        new AppError('Zona no encontrada', 404)
      );
    });

    it('debería lanzar AppError si nombre ya está en uso', async () => {
      // 1. obtenerPorId
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: zonaBase,
        error: null,
      });
      // 2. existeNombreEnSucursal -> hay duplicado
      mockSupabase.from().mockResult({ data: [{ id_zona: 99 }], error: null });

      await expect(zonaService.actualizar(1, actualizarDto)).rejects.toThrow(
        new AppError('Ya existe una zona con ese nombre en esta sucursal', 409)
      );
    });
  });

  describe('desactivar', () => {

    // ✅ CASOS CORRECTOS
    it('debería desactivar una zona sin mesas activas', async () => {
      const zonaDesactivada = { ...zonaBase, activo: false };

      // 1. tieneInformacionActivaAsociada: from().select().eq().eq().limit() -> await -> mockResult
      mockSupabase.from().mockResult({ data: [], error: null });
      // 2. update + select + single
      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: zonaDesactivada,
        error: null,
      });

      const resultado = await zonaService.desactivar(1);

      expect(resultado.activo).toBe(false);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si tiene mesas activas', async () => {
      // tieneInformacionActivaAsociada -> hay mesas activas
      mockSupabase.from().mockResult({ data: [{ id_mesa: 1 }], error: null });

      await expect(zonaService.desactivar(1)).rejects.toThrow(
        new AppError('No se puede desactivar: la zona tiene información activa asociada.', 409)
      );
    });
  });

  describe('activar', () => {

    // ✅ CASOS CORRECTOS
    it('debería activar una zona', async () => {
      const zonaActivada = { ...zonaBase, activo: true };

      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: zonaActivada,
        error: null,
      });

      const resultado = await zonaService.activar(1);

      expect(resultado.activo).toBe(true);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si falla la activación', async () => {
      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error de BD' },
      });

      await expect(zonaService.activar(1)).rejects.toThrow(
        new AppError('Error al activar la zona', 500)
      );
    });
  });
});
