import { PagoService } from '../../../services/pago.service';
import { createSupabaseMock, mockSuccessResponse, mockErrorResponse } from '../../mocks/supabase.mock';
import { AppError } from '../../../helpers/app-error';

// Mockear el módulo de supabase
jest.mock('../../../config/supabase');

describe('PagoService', () => {
  let pagoService: PagoService;
  let mockSupabase: any;

    beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createSupabaseMock();
    
    const supabaseModule = require('../../../config/supabase');
    supabaseModule.default = mockSupabase;
    
    pagoService = new PagoService();
  });

  describe('listarMetodosPago', () => {
    
    // ✅ CASOS CORRECTOS
    it('debería listar métodos de pago correctamente', async () => {
      const metodos = [
        {
          id_sucursal_pago: 1,
          id_sucursal: 1,
          activo: true,
          tipo_pago: { nombre: 'TARJETA' },
        },
        {
          id_sucursal_pago: 2,
          id_sucursal: 1,
          activo: true,
          tipo_pago: { nombre: 'EFECTIVO' },
        },
      ];

      // listarMetodosPago usa .eq().eq() — se usa mockResult para la cadena doble
      mockSupabase.from().mockResult({ data: metodos, error: null });

      const resultado = await pagoService.listarMetodosPago(1);

      expect(resultado).toHaveLength(2);
      expect(resultado[0].metodo).toBe('TARJETA');
      expect(resultado[1].metodo).toBe('EFECTIVO');
    });

    it('debería retornar array vacío si no hay métodos', async () => {
      mockSupabase.from().mockResult({ data: null, error: null });

      const resultado = await pagoService.listarMetodosPago(1);

      expect(resultado).toEqual([]);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si hay error en BD', async () => {
      mockSupabase.from().mockResult({ data: null, error: { message: 'Error de conexión' } });

      await expect(pagoService.listarMetodosPago(1)).rejects.toThrow(
        new AppError('Error al listar métodos de pago', 500)
      );
    });
  });

  describe('crearPago', () => {
    
    const crearPagoDto = {
      id_orden: 1,
      monto: 100,
      metodo: 'TARJETA',
      referencia: 'REF123',
      propina: 10,
    };

    // ✅ CASOS CORRECTOS
    it('debería crear un pago correctamente', async () => {
      // Mock para obtener tipo_pago
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id_tipo_pago: 5 },
        error: null,
      });

      // Mock para insertar pago
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id_pago_pedido: 1 },
        error: null,
      });

      const resultado = await pagoService.crearPago(crearPagoDto);

      expect(resultado.id_pago).toBe(1);
      expect(resultado.monto).toBe(100);
      expect(resultado.estado).toBe('pendiente');
      expect(resultado.metodo).toBe('TARJETA');
    });

    it('debería manejar propina undefined', async () => {
      const dtoSinPropina = { ...crearPagoDto, propina: undefined };

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id_tipo_pago: 5 },
        error: null,
      });

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id_pago_pedido: 2 },
        error: null,
      });

      const resultado = await pagoService.crearPago(dtoSinPropina);

      expect(resultado.propina).toBeUndefined();
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar error si método de pago no existe', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No encontrado' },
      });

      await expect(pagoService.crearPago(crearPagoDto)).rejects.toThrow(
        new AppError('Método de pago no encontrado', 400)
      );
    });

    it('debería lanzar error si falla insertar pago', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id_tipo_pago: 5 },
        error: null,
      });

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error de BD' },
      });

      await expect(pagoService.crearPago(crearPagoDto)).rejects.toThrow(
        new AppError('Error al crear pago', 500)
      );
    });
  });

  describe('listarPagosOrden', () => {
    
    // ✅ CASOS CORRECTOS
    it('debería listar pagos de una orden', async () => {
      const pagos = [
        {
          id_pago: 1,
          id_orden: 1,
          monto: 100,
          estado: 'completado',
          fecha_pago: new Date(),
        },
        {
          id_pago: 2,
          id_orden: 1,
          monto: 50,
          estado: 'pendiente',
          fecha_pago: new Date(),
        },
      ];

      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: pagos,
        error: null,
      });

      const resultado = await pagoService.listarPagosOrden(1);

      expect(resultado).toHaveLength(2);
      expect(resultado[0].id_pago).toBe(1);
    });

    it('debería retornar array vacío si orden no tiene pagos', async () => {
      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: null,
        error: null,
      });

      const resultado = await pagoService.listarPagosOrden(1);

      expect(resultado).toEqual([]);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar error si falla al listar pagos', async () => {
      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: null,
        error: { message: 'Error de BD' },
      });

      await expect(pagoService.listarPagosOrden(1)).rejects.toThrow(
        new AppError('Error al listar pagos de orden', 500)
      );
    });
  });

  describe('actualizarEstadoPago', () => {
    
    // ✅ CASOS CORRECTOS
    it('debería actualizar estado de pago correctamente', async () => {
      const pagoActualizado = {
        id_pago: 1,
        estado: 'completado',
        monto: 100,
        fecha_pago: new Date(),
      };

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: pagoActualizado,
        error: null,
      });

      const resultado = await pagoService.actualizarEstadoPago(1, 'completado');

      expect(resultado.estado).toBe('completado');
      expect(resultado.id_pago).toBe(1);
    });

    it('debería actualizar a estado rechazado', async () => {
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: { id_pago: 1, estado: 'rechazado' },
        error: null,
      });

      const resultado = await pagoService.actualizarEstadoPago(1, 'rechazado');

      expect(resultado.estado).toBe('rechazado');
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar error si falla actualización', async () => {
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Error de BD' },
      });

      await expect(pagoService.actualizarEstadoPago(1, 'completado')).rejects.toThrow(
        new AppError('Error al actualizar estado de pago', 500)
      );
    });
  });
});