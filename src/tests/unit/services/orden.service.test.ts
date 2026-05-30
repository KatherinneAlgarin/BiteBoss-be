import { OrdenService } from '../../../services/orden.service';
import { createSupabaseMock } from '../../mocks/supabase.mock';
import { AppError } from '../../../helpers/app-error';

jest.mock('../../../config/supabase');

describe('OrdenService', () => {
  let ordenService: OrdenService;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createSupabaseMock();
    const supabaseModule = require('../../../config/supabase');
    supabaseModule.default = mockSupabase;
    ordenService = new OrdenService();
  });

  const pedidoBase = {
    id_pedido: 1,
    total: 50,
    fecha_apertura: '2024-01-01T10:00:00Z',
    nombre_cliente: 'Ana',
    apellido_cliente: 'García',
    estado_operativo: 'NUEVO',
    id_usuario: null,
    id_sucursal: 1,
    id_sucursal_tipo_orden: 1,
    sucursal_tipo_orden: { tipo_orden: { nombre: 'Para llevar' } },
    pedido_mesa: [],
  };

  describe('calcularTotales', () => {

    it('debería sumar los subtotales de los detalles', async () => {
      const detalles: any[] = [
        { subtotal: 25.99 },
        { subtotal: 15.50 },
      ];
      const total = await ordenService.calcularTotales(detalles);
      expect(total).toBeCloseTo(41.49);
    });

    it('debería retornar 0 si no hay detalles', async () => {
      const total = await ordenService.calcularTotales([]);
      expect(total).toBe(0);
    });
  });

  describe('listarOrdenes', () => {

    // ✅ CASOS CORRECTOS
    it('debería listar órdenes sin filtros (sin id_usuario)', async () => {
      // from().select().order() -> order() devuelve queryBuilder -> mockResult
      // id_usuario: null => userIds vacío => no segunda query
      mockSupabase.from().mockResult({ data: [pedidoBase], error: null });

      const resultado = await ordenService.listarOrdenes();

      expect(resultado).toHaveLength(1);
      expect(resultado[0].tipo_orden).toBe('Para llevar');
      expect(resultado[0].estado_operativo).toBe('NUEVO');
    });

    it('debería retornar array vacío si no hay pedidos', async () => {
      mockSupabase.from().mockResult({ data: null, error: null });

      const resultado = await ordenService.listarOrdenes();

      expect(resultado).toEqual([]);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si falla la consulta', async () => {
      mockSupabase.from().mockResult({ data: null, error: { message: 'Error de BD' } });

      await expect(ordenService.listarOrdenes()).rejects.toThrow(
        new AppError('Error al listar pedidos', 500)
      );
    });
  });

  describe('obtenerOrdenPorId', () => {

    // ✅ CASOS CORRECTOS
    it('debería retornar la orden si existe', async () => {
      // from().select().eq().single()
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id_pedido: 1, total: 50, estado_operativo: 'NUEVO' },
        error: null,
      });

      const resultado = await ordenService.obtenerOrdenPorId(1);

      expect(resultado).not.toBeNull();
      expect(resultado?.numero_orden).toBe('1');
    });

    it('debería retornar null si no existe (PGRST116)', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      const resultado = await ordenService.obtenerOrdenPorId(999);

      expect(resultado).toBeNull();
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si hay error de BD', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'OTHER', message: 'Error' },
      });

      await expect(ordenService.obtenerOrdenPorId(1)).rejects.toThrow(
        new AppError('Error al obtener pedido', 500)
      );
    });
  });

  describe('obtenerDetallesOrden', () => {

    // ✅ CASOS CORRECTOS
    it('debería retornar los detalles de una orden', async () => {
      const detalleData = {
        id_pedido_producto: 1,
        id_pedido: 1,
        id_producto: 1,
        cantidad: 2,
        precio_unitario: 15,
        subtotal: 30,
        estado_linea: 'PENDIENTE',
        producto: { nombre: 'Hamburguesa' },
      };
      // from().select().eq() -> ends with eq() -> mockResult
      mockSupabase.from().mockResult({ data: [detalleData], error: null });

      const resultado = await ordenService.obtenerDetallesOrden(1);

      expect(resultado).toHaveLength(1);
      expect(resultado[0].nombre_producto).toBe('Hamburguesa');
    });

    it('debería retornar array vacío si no hay detalles', async () => {
      mockSupabase.from().mockResult({ data: null, error: null });

      const resultado = await ordenService.obtenerDetallesOrden(1);

      expect(resultado).toEqual([]);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si falla la consulta', async () => {
      mockSupabase.from().mockResult({ data: null, error: { message: 'Error' } });

      await expect(ordenService.obtenerDetallesOrden(1)).rejects.toThrow(
        new AppError('Error al obtener detalles del pedido', 500)
      );
    });
  });

  describe('actualizarOrden', () => {

    // ✅ CASOS CORRECTOS
    it('debería actualizar el estado_operativo sin recalcular si no es necesario', async () => {
      // dto solo tiene estado_operativo -> llama recalcularTotales al final
      const pedidoActualizado = { id_pedido: 1, estado_operativo: 'EN_PROCESO', total: 50 };

      // 1. update().eq().select().single()
      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: pedidoActualizado,
        error: null,
      });
      // 2. recalcularTotales -> obtenerDetallesOrden -> mockResult
      mockSupabase.from().mockResult({ data: [], error: null });
      // 3. recalcularTotales -> update total -> from().update().eq() -> mockResult
      mockSupabase.from().mockResult({ data: null, error: null });

      const resultado = await ordenService.actualizarOrden(1, { estado_operativo: 'EN_PROCESO' });

      expect(resultado.estado_operativo).toBe('EN_PROCESO');
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si falla el update', async () => {
      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error de BD' },
      });

      await expect(ordenService.actualizarOrden(1, { estado_operativo: 'CANCELADO' })).rejects.toThrow(
        new AppError('Error al actualizar pedido', 500)
      );
    });
  });

  describe('agregarDetalleOrden', () => {

    // ✅ CASOS CORRECTOS
    it('debería agregar un detalle y recalcular totales', async () => {
      const detalleCreado = { id_pedido_producto: 1, id_pedido: 1, id_producto: 1, cantidad: 2, subtotal: 30 };

      // 1. from('producto').select().eq().single()
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { precio: 15, nombre: 'Hamburguesa' },
        error: null,
      });
      // 2. from('pedido_producto').insert().select().single()
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: detalleCreado,
        error: null,
      });
      // 3. recalcularTotales -> obtenerDetallesOrden -> mockResult
      mockSupabase.from().mockResult({ data: [{ subtotal: 30 }], error: null });
      // 4. recalcularTotales -> update pedido -> mockResult
      mockSupabase.from().mockResult({ data: null, error: null });

      const resultado = await ordenService.agregarDetalleOrden(1, 1, 2, undefined, 1);

      expect(resultado.subtotal).toBe(30);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si el producto no existe', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No encontrado' },
      });

      await expect(ordenService.agregarDetalleOrden(1, 999, 1, undefined, 1)).rejects.toThrow(
        new AppError('Producto no encontrado', 404)
      );
    });
  });

  describe('removerDetalleOrden', () => {

    // ✅ CASOS CORRECTOS
    it('debería remover un detalle y recalcular totales', async () => {
      // 1. from('pedido_producto').select().eq().single() -> obtener id_pedido
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id_pedido: 1 },
        error: null,
      });
      // 2. delete().eq() -> ends with eq() -> mockResult
      mockSupabase.from().mockResult({ data: null, error: null });
      // 3. recalcularTotales -> obtenerDetallesOrden -> mockResult
      mockSupabase.from().mockResult({ data: [], error: null });
      // 4. recalcularTotales -> update pedido -> mockResult
      mockSupabase.from().mockResult({ data: null, error: null });

      await expect(ordenService.removerDetalleOrden(1)).resolves.toBeUndefined();
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si el detalle no existe', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No encontrado' },
      });

      await expect(ordenService.removerDetalleOrden(999)).rejects.toThrow(
        new AppError('Detalle no encontrado', 404)
      );
    });
  });

  describe('cancelarOrden', () => {

    // ✅ CASOS CORRECTOS
    it('debería cancelar una orden', async () => {
      // from().update().eq() -> ends with eq() -> mockResult
      mockSupabase.from().mockResult({ data: null, error: null });

      await expect(ordenService.cancelarOrden(1)).resolves.toBeUndefined();
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si falla el update', async () => {
      mockSupabase.from().mockResult({ data: null, error: { message: 'Error de BD' } });

      await expect(ordenService.cancelarOrden(1)).rejects.toThrow(
        new AppError('Error al cancelar pedido', 500)
      );
    });
  });
});
