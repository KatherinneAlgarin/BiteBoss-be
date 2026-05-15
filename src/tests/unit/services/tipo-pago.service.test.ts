import { TipoPagoService } from '../../../services/tipo-pago.service';
import { createSupabaseMock } from '../../mocks/supabase.mock';
import { AppError } from '../../../helpers/app-error';

jest.mock('../../../config/supabase');

describe('TipoPagoService', () => {
  let tipoPagoService: TipoPagoService;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createSupabaseMock();
    const supabaseModule = require('../../../config/supabase');
    supabaseModule.default = mockSupabase;
    tipoPagoService = new TipoPagoService();
  });

  describe('listar', () => {

    const tiposPagoResponse = [
      { id_tipo_pago: 1, nombre: 'EFECTIVO', activo: true },
      { id_tipo_pago: 2, nombre: 'TARJETA', activo: true },
      { id_tipo_pago: 3, nombre: 'TRANSFERENCIA', activo: false },
    ];

    // ✅ CASOS CORRECTOS
    it('debería listar todos los tipos de pago', async () => {
      // from('tipo_pago').select().order() -> order() devuelve queryBuilder -> mockResult
      mockSupabase.from().mockResult({ data: tiposPagoResponse, error: null });

      const resultado = await tipoPagoService.listar();

      expect(resultado).toHaveLength(3);
      expect(resultado[0].nombre).toBe('EFECTIVO');
      expect(resultado[1].nombre).toBe('TARJETA');
    });

    it('debería retornar array vacío si no hay tipos de pago', async () => {
      mockSupabase.from().mockResult({ data: null, error: null });

      const resultado = await tipoPagoService.listar();

      expect(resultado).toEqual([]);
    });

    it('debería mapear activo con valor por defecto true', async () => {
      mockSupabase.from().mockResult({
        data: [{ id_tipo_pago: 1, nombre: 'EFECTIVO', activo: null }],
        error: null,
      });

      const resultado = await tipoPagoService.listar();

      expect(resultado[0].activo).toBe(true);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si falla la consulta', async () => {
      mockSupabase.from().mockResult({ data: null, error: { message: 'Error de BD' } });

      await expect(tipoPagoService.listar()).rejects.toThrow(
        new AppError('Error al listar tipos de pago', 500)
      );
    });
  });
});
