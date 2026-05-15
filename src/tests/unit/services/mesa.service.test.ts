import { MesaService } from '../../../services/mesa.service';
import { createSupabaseMock } from '../../mocks/supabase.mock';
import { AppError } from '../../../helpers/app-error';

jest.mock('../../../config/supabase');

describe('MesaService', () => {
  let mesaService: MesaService;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createSupabaseMock();
    const supabaseModule = require('../../../config/supabase');
    supabaseModule.default = mockSupabase;
    mesaService = new MesaService();
  });

  const mesaBase = {
    id_mesa: 1,
    id_zona: 1,
    numero: 5,
    capacidad: 4,
    activo: true,
  };

  describe('listarPorZona', () => {

    // ✅ CASOS CORRECTOS
    it('debería listar mesas de una zona', async () => {
      // from().select().eq().order() -> order() devuelve queryBuilder -> mockResult
      mockSupabase.from().mockResult({ data: [mesaBase], error: null });

      const resultado = await mesaService.listarPorZona(1);

      expect(resultado).toHaveLength(1);
      expect(resultado[0].numero).toBe(5);
      expect(resultado[0].capacidad).toBe(4);
    });

    it('debería retornar array vacío si no hay mesas', async () => {
      mockSupabase.from().mockResult({ data: null, error: null });

      const resultado = await mesaService.listarPorZona(1);

      expect(resultado).toEqual([]);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si falla la consulta', async () => {
      mockSupabase.from().mockResult({ data: null, error: { message: 'Error de BD' } });

      await expect(mesaService.listarPorZona(1)).rejects.toThrow(
        new AppError('Error al listar mesas', 500)
      );
    });
  });

  describe('obtenerPorId', () => {

    // ✅ CASOS CORRECTOS
    it('debería retornar la mesa si existe', async () => {
      // from().select().eq().maybeSingle()
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: mesaBase,
        error: null,
      });

      const resultado = await mesaService.obtenerPorId(1);

      expect(resultado).not.toBeNull();
      expect(resultado?.numero).toBe(5);
    });

    it('debería retornar null si la mesa no existe', async () => {
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const resultado = await mesaService.obtenerPorId(999);

      expect(resultado).toBeNull();
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si hay error de BD', async () => {
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error de BD' },
      });

      await expect(mesaService.obtenerPorId(1)).rejects.toThrow(
        new AppError('Error al obtener mesa', 500)
      );
    });
  });

  describe('crear', () => {

    const crearDto = { id_zona: 1, numero: 5, capacidad: 4 };

    // ✅ CASOS CORRECTOS
    it('debería crear una mesa exitosamente', async () => {
      // 1. existeZona: from().select().eq().maybeSingle()
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: { id_zona: 1 },
        error: null,
      });
      // 2. existeNumeroEnZona: from().select().eq().eq() -> await -> mockResult
      mockSupabase.from().mockResult({ data: [], error: null });
      // 3. insert: from().insert().select().single()
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: mesaBase,
        error: null,
      });

      const resultado = await mesaService.crear(crearDto);

      expect(resultado.numero).toBe(5);
      expect(resultado.capacidad).toBe(4);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si la zona no existe', async () => {
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(mesaService.crear(crearDto)).rejects.toThrow(
        new AppError('La zona indicada no existe', 400)
      );
    });

    it('debería lanzar AppError si el número ya existe en la zona', async () => {
      // 1. existeZona -> existe
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: { id_zona: 1 },
        error: null,
      });
      // 2. existeNumeroEnZona -> ya existe
      mockSupabase.from().mockResult({ data: [{ id_mesa: 10 }], error: null });

      await expect(mesaService.crear(crearDto)).rejects.toThrow(
        new AppError('Ya existe una mesa con ese número en esta zona', 409)
      );
    });
  });

  describe('actualizar', () => {

    // ✅ CASOS CORRECTOS
    it('debería actualizar solo la capacidad (sin cambio de zona ni numero)', async () => {
      const mesaActualizada = { ...mesaBase, capacidad: 8 };

      // 1. obtenerPorId (mesa actual)
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: mesaBase,
        error: null,
      });
      // cambioRelevante=false (solo capacidad) -> NO llama existeNumeroEnZona
      // 2. update -> from().update().eq() -> ends with eq() -> mockResult
      mockSupabase.from().mockResult({ data: null, error: null });
      // 3. obtenerPorId (tras update)
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: mesaActualizada,
        error: null,
      });

      const resultado = await mesaService.actualizar(1, { capacidad: 8 });

      expect(resultado.capacidad).toBe(8);
    });

    it('debería retornar la mesa sin cambios si el dto está vacío', async () => {
      // 1. obtenerPorId
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: mesaBase,
        error: null,
      });

      const resultado = await mesaService.actualizar(1, {});

      expect(resultado.numero).toBe(5);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si la mesa no existe', async () => {
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(mesaService.actualizar(999, { capacidad: 4 })).rejects.toThrow(
        new AppError('Mesa no encontrada', 404)
      );
    });
  });

  describe('desactivar', () => {

    // ✅ CASOS CORRECTOS
    it('debería desactivar una mesa', async () => {
      const mesaDesactivada = { ...mesaBase, activo: false };

      // from().update().eq().select().single()
      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: mesaDesactivada,
        error: null,
      });

      const resultado = await mesaService.desactivar(1);

      expect(resultado.activo).toBe(false);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si falla la desactivación', async () => {
      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error de BD' },
      });

      await expect(mesaService.desactivar(1)).rejects.toThrow(
        new AppError('Error al desactivar la mesa', 500)
      );
    });
  });

  describe('activar', () => {

    // ✅ CASOS CORRECTOS
    it('debería activar una mesa', async () => {
      const mesaActivada = { ...mesaBase, activo: true };

      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: mesaActivada,
        error: null,
      });

      const resultado = await mesaService.activar(1);

      expect(resultado.activo).toBe(true);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si falla la activación', async () => {
      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error de BD' },
      });

      await expect(mesaService.activar(1)).rejects.toThrow(
        new AppError('Error al activar la mesa', 500)
      );
    });
  });
});
