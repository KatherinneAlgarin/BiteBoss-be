import { InventarioService } from '../../../services/inventario.service';
import { createSupabaseMock } from '../../mocks/supabase.mock';
import { AppError } from '../../../helpers/app-error';

jest.mock('../../../config/supabase');

describe('InventarioService', () => {
  let inventarioService: InventarioService;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createSupabaseMock();
    const supabaseModule = require('../../../config/supabase');
    supabaseModule.default = mockSupabase;
    inventarioService = new InventarioService();
  });

  describe('ajustarStock (HU-17)', () => {
    it('deberia ajustar stock con tipo automatico AJUSTE_POSITIVO y registrar nota', async () => {
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: {
          id_inventario: 10,
          id_bodega: 2,
          stock_actual: 5,
          stock_minimo: 3,
          bodega: { id_sucursal: 1, nombre: 'Central' },
        },
        error: null,
      });

      mockSupabase.from().mockResult({ data: null, error: null }); // update inventario
      mockSupabase.from().mockResult({ data: null, error: null }); // insert movimiento

      await inventarioService.ajustarStock(
        10,
        { nueva_cantidad: 8, nota: 'Conteo fisico corregido por diferencia de ingreso' },
        { id_usuario: 7, rol: 'ENCARGADO', id_sucursal: 1 }
      );

      expect(mockSupabase.from().update).toHaveBeenCalledWith({ stock_actual: 8 });
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'AJUSTE_POSITIVO',
          id_inventario: 10,
          id_usuario: 7,
          cantidad: 3,
          stock_anterior: 5,
          stock_nuevo: 8,
          nota: 'Conteo fisico corregido por diferencia de ingreso',
        })
      );
    });

    it('deberia ajustar stock con tipo automatico AJUSTE_NEGATIVO', async () => {
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: {
          id_inventario: 11,
          id_bodega: 2,
          stock_actual: 10,
          stock_minimo: 2,
          bodega: { id_sucursal: 1, nombre: 'Central' },
        },
        error: null,
      });

      mockSupabase.from().mockResult({ data: null, error: null });
      mockSupabase.from().mockResult({ data: null, error: null });

      await inventarioService.ajustarStock(
        11,
        { nueva_cantidad: 4, nota: 'Ajuste por merma detectada en cierre de turno' },
        { id_usuario: 7, rol: 'ENCARGADO', id_sucursal: 1 }
      );

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'AJUSTE_NEGATIVO',
          cantidad: 6,
          stock_anterior: 10,
          stock_nuevo: 4,
        })
      );
    });

    it('deberia permitir que ADMIN ajuste cualquier sucursal', async () => {
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: {
          id_inventario: 20,
          id_bodega: 9,
          stock_actual: 7,
          stock_minimo: 2,
          bodega: { id_sucursal: 99, nombre: 'Otra sucursal' },
        },
        error: null,
      });

      mockSupabase.from().mockResult({ data: null, error: null });
      mockSupabase.from().mockResult({ data: null, error: null });

      await expect(
        inventarioService.ajustarStock(
          20,
          { nueva_cantidad: 9, nota: 'Ajuste autorizado por administrador general' },
          { id_usuario: 1, rol: 'ADMIN', id_sucursal: 1 }
        )
      ).resolves.toBeUndefined();
    });

    it('deberia bloquear ajuste de sucursal diferente para no-admin', async () => {
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: {
          id_inventario: 12,
          id_bodega: 8,
          stock_actual: 6,
          stock_minimo: 2,
          bodega: { id_sucursal: 3, nombre: 'Sucursal 3' },
        },
        error: null,
      });

      await expect(
        inventarioService.ajustarStock(
          12,
          { nueva_cantidad: 8, nota: 'Conteo validado por inventario semanal' },
          { id_usuario: 7, rol: 'ENCARGADO', id_sucursal: 1 }
        )
      ).rejects.toThrow(new AppError('Solo puedes ajustar stock de tu sucursal', 403));
    });

    it('deberia bloquear cuando la cantidad nueva es igual al stock actual', async () => {
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: {
          id_inventario: 13,
          id_bodega: 8,
          stock_actual: 6,
          stock_minimo: 2,
          bodega: { id_sucursal: 1, nombre: 'Sucursal 1' },
        },
        error: null,
      });

      await expect(
        inventarioService.ajustarStock(
          13,
          { nueva_cantidad: 6, nota: 'Nota valida para intento sin cambios' },
          { id_usuario: 7, rol: 'ENCARGADO', id_sucursal: 1 }
        )
      ).rejects.toThrow(new AppError('La nueva cantidad debe ser diferente al stock actual', 400));
    });

    it('deberia bloquear stock negativo', async () => {
      mockSupabase.from().select().eq().maybeSingle.mockResolvedValueOnce({
        data: {
          id_inventario: 14,
          id_bodega: 8,
          stock_actual: 6,
          stock_minimo: 2,
          bodega: { id_sucursal: 1, nombre: 'Sucursal 1' },
        },
        error: null,
      });

      await expect(
        inventarioService.ajustarStock(
          14,
          { nueva_cantidad: -1, nota: 'Nota valida para intento de stock negativo' },
          { id_usuario: 7, rol: 'ENCARGADO', id_sucursal: 1 }
        )
      ).rejects.toThrow(new AppError('El ajuste resultaría en stock negativo', 400));
    });
  });
});
