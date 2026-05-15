import { TipoOrdenService } from '../../../services/tipo-orden.service';
import { createSupabaseMock } from '../../mocks/supabase.mock';
import { AppError } from '../../../helpers/app-error';

jest.mock('../../../config/supabase');
jest.mock('../../../domain/constants/pedido', () => ({
  ESTADOS_PEDIDO_TERMINALES: ['CANCELADO', 'ENTREGADO'],
}));

describe('TipoOrdenService', () => {
  let tipoOrdenService: TipoOrdenService;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createSupabaseMock();
    const supabaseModule = require('../../../config/supabase');
    supabaseModule.default = mockSupabase;
    tipoOrdenService = new TipoOrdenService();
  });

  const tipoOrdenBase = {
    id_tipo_orden: 1,
    nombre: 'Para llevar',
    id_tipo_orden_padre: null,
    nombre_padre: null,
    requiere_mesa: false,
    activo: true,
  };

  describe('listar', () => {

    // ✅ CASOS CORRECTOS
    it('debería listar todos los tipos de orden', async () => {
      // from().select().order().order() -> ambos .order() devuelven queryBuilder -> mockResult
      mockSupabase.from().mockResult({ data: [tipoOrdenBase], error: null });

      const resultado = await tipoOrdenService.listar();

      expect(resultado).toHaveLength(1);
      expect(resultado[0].nombre).toBe('Para llevar');
    });

    it('debería retornar array vacío si no hay tipos', async () => {
      mockSupabase.from().mockResult({ data: null, error: null });

      const resultado = await tipoOrdenService.listar();

      expect(resultado).toEqual([]);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si falla la consulta', async () => {
      mockSupabase.from().mockResult({ data: null, error: { message: 'Error de BD' } });

      await expect(tipoOrdenService.listar()).rejects.toThrow(
        new AppError('Error al listar tipos de orden', 500)
      );
    });
  });

  describe('obtenerPorId', () => {

    // ✅ CASOS CORRECTOS
    it('debería retornar el tipo de orden si existe', async () => {
      // from().select().eq().single()
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: tipoOrdenBase,
        error: null,
      });

      const resultado = await tipoOrdenService.obtenerPorId(1);

      expect(resultado).not.toBeNull();
      expect(resultado?.nombre).toBe('Para llevar');
    });

    it('debería retornar null si no existe (PGRST116)', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      const resultado = await tipoOrdenService.obtenerPorId(999);

      expect(resultado).toBeNull();
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si hay error de BD', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'OTHER', message: 'Error' },
      });

      await expect(tipoOrdenService.obtenerPorId(1)).rejects.toThrow(
        new AppError('Error al obtener tipo de orden', 500)
      );
    });
  });

  describe('crear', () => {

    const crearDto = { nombre: 'Express', id_tipo_orden_padre: null, requiere_mesa: false };

    // ✅ CASOS CORRECTOS
    it('debería crear un tipo de orden sin padre', async () => {
      // 1. existeNombreCI: from().select().ilike() -> await -> mockResult (no duplicado)
      mockSupabase.from().mockResult({ data: [], error: null });
      // 2. insert: from().insert().select().single()
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id_tipo_orden: 2 },
        error: null,
      });
      // 3. obtenerPorId (tras crear)
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { ...tipoOrdenBase, id_tipo_orden: 2, nombre: 'Express' },
        error: null,
      });

      const resultado = await tipoOrdenService.crear(crearDto);

      expect(resultado.nombre).toBe('Express');
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si el nombre ya existe', async () => {
      // existeNombreCI -> hay duplicado
      mockSupabase.from().mockResult({ data: [{ id_tipo_orden: 5 }], error: null });

      await expect(tipoOrdenService.crear(crearDto)).rejects.toThrow(
        new AppError('Ya existe un tipo de orden con ese nombre', 409)
      );
    });

    it('debería lanzar AppError si el padre no existe', async () => {
      // 1. existeNombreCI -> no duplicado
      mockSupabase.from().mockResult({ data: [], error: null });
      // 2. existeId (padre): from().select().eq().maybeSingle() -> null
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(
        tipoOrdenService.crear({ ...crearDto, id_tipo_orden_padre: 99 })
      ).rejects.toThrow(new AppError('El tipo de orden padre no existe', 400));
    });
  });

  describe('actualizar', () => {

    const actualizarDto = { requiere_mesa: true };

    // ✅ CASOS CORRECTOS
    it('debería actualizar solo requiere_mesa (sin verificar nombre ni padre)', async () => {
      const actualizado = { ...tipoOrdenBase, requiere_mesa: true };

      // 1. obtenerPorId (existe)
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: tipoOrdenBase,
        error: null,
      });
      // dto no tiene nombre ni id_tipo_orden_padre -> se omiten esas validaciones
      // 2. update -> from().update().eq() -> ends with eq() -> mockResult
      mockSupabase.from().mockResult({ data: null, error: null });
      // 3. obtenerPorId (tras update)
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: actualizado,
        error: null,
      });

      const resultado = await tipoOrdenService.actualizar(1, actualizarDto);

      expect(resultado.requiere_mesa).toBe(true);
    });

    it('debería retornar el tipo sin cambios si el dto está vacío', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: tipoOrdenBase,
        error: null,
      });

      const resultado = await tipoOrdenService.actualizar(1, {});

      expect(resultado.nombre).toBe('Para llevar');
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si el tipo no existe', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      await expect(tipoOrdenService.actualizar(999, actualizarDto)).rejects.toThrow(
        new AppError('Tipo de orden no encontrado', 404)
      );
    });
  });

  describe('desactivar', () => {

    // ✅ CASOS CORRECTOS
    it('debería desactivar un tipo de orden sin hijos ni pedidos activos', async () => {
      const desactivado = { ...tipoOrdenBase, activo: false };

      // 1. obtenerPorId
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: tipoOrdenBase,
        error: null,
      });
      // 2. obtenerHijosRecursivos: from().select().eq() -> await -> mockResult (sin hijos)
      mockSupabase.from().mockResult({ data: [], error: null });
      // 3. tienePedidosActivos (para el tipo mismo):
      //    from().select().eq() -> await -> mockResult (sin vinculos)
      mockSupabase.from().mockResult({ data: [], error: null });
      // 4. update activo:false -> from().update().in() -> await -> mockResult
      mockSupabase.from().mockResult({ data: null, error: null });
      // 5. obtenerPorId (tras desactivar)
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: desactivado,
        error: null,
      });

      const resultado = await tipoOrdenService.desactivar(1);

      expect(resultado.activo).toBe(false);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si el tipo no existe', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      await expect(tipoOrdenService.desactivar(999)).rejects.toThrow(
        new AppError('Tipo de orden no encontrado', 404)
      );
    });

    it('debería lanzar AppError si tiene pedidos activos', async () => {
      // 1. obtenerPorId
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: tipoOrdenBase,
        error: null,
      });
      // 2. obtenerHijosRecursivos -> sin hijos
      mockSupabase.from().mockResult({ data: [], error: null });
      // 3. tienePedidosActivos: vinculos del tipo
      mockSupabase.from().mockResult({ data: [{ id_sucursal_tipo_orden: 1 }], error: null });
      // pedidos activos
      mockSupabase.from().mockResult({ data: [{ id_pedido: 10 }], error: null });

      await expect(tipoOrdenService.desactivar(1)).rejects.toThrow(
        new AppError('No se puede desactivar: tiene información activa asociada.', 409)
      );
    });
  });

  describe('activar', () => {

    // ✅ CASOS CORRECTOS
    it('debería activar un tipo de orden sin padre', async () => {
      const activado = { ...tipoOrdenBase, activo: true };

      // 1. obtenerPorId (no tiene padre)
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: tipoOrdenBase,
        error: null,
      });
      // 2. obtenerHijosRecursivos -> sin hijos
      mockSupabase.from().mockResult({ data: [], error: null });
      // 3. update activo:true -> from().update().in() -> await -> mockResult
      mockSupabase.from().mockResult({ data: null, error: null });
      // 4. obtenerPorId (tras activar)
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: activado,
        error: null,
      });

      const resultado = await tipoOrdenService.activar(1);

      expect(resultado.activo).toBe(true);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si el tipo no existe', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      await expect(tipoOrdenService.activar(999)).rejects.toThrow(
        new AppError('Tipo de orden no encontrado', 404)
      );
    });

    it('debería lanzar AppError si el padre está inactivo', async () => {
      const tipoConPadre = { ...tipoOrdenBase, id_tipo_orden_padre: 5 };
      const padreInactivo = { id_tipo_orden: 5, nombre: 'Padre', activo: false, id_tipo_orden_padre: null, nombre_padre: null, requiere_mesa: false };

      // 1. obtenerPorId (tiene padre)
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: tipoConPadre,
        error: null,
      });
      // 2. obtenerPorId del padre -> padre inactivo
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: padreInactivo,
        error: null,
      });

      await expect(tipoOrdenService.activar(1)).rejects.toThrow(AppError);
    });
  });
});
