import { validateCrearPago } from '../../../domain/validators/pago.validator';
import { createSupabaseMock } from '../../mocks/supabase.mock';

jest.mock('../../../config/supabase');

describe('validateCrearPago', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createSupabaseMock();
    const supabaseModule = require('../../../config/supabase');
    supabaseModule.default = mockSupabase;
  });

  const baseDto = {
    id_orden: 1,
    monto: 100,
    metodo: 'TARJETA',
    referencia: 'REF123',
    propina: 10,
  };

  // ✅ CASOS CORRECTOS
  it('debería retornar data con campos válidos', async () => {
    mockSupabase.from().select().maybeSingle.mockResolvedValueOnce({
      data: { id_tipo_pago: 1 },
      error: null,
    });

    const resultado = await validateCrearPago(baseDto);

    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.id_orden).toBe(1);
    expect(resultado.data?.monto).toBe(100);
    expect(resultado.data?.metodo).toBe('TARJETA');
  });

  it('debería retornar data sin propina', async () => {
    mockSupabase.from().select().maybeSingle.mockResolvedValueOnce({
      data: { id_tipo_pago: 1 },
      error: null,
    });

    const resultado = await validateCrearPago({ ...baseDto, propina: undefined });

    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.propina).toBeUndefined();
  });

  it('debería recortar espacios del metodo', async () => {
    mockSupabase.from().select().maybeSingle.mockResolvedValueOnce({
      data: { id_tipo_pago: 1 },
      error: null,
    });

    const resultado = await validateCrearPago({ ...baseDto, metodo: '  EFECTIVO  ' });

    expect(resultado.data?.metodo).toBe('EFECTIVO');
  });

  // ❌ CASOS DE ERROR
  it('debería retornar error si id_orden es undefined', async () => {
    const resultado = await validateCrearPago({ monto: 100, metodo: 'TARJETA' });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si id_orden no es número', async () => {
    const resultado = await validateCrearPago({ ...baseDto, id_orden: 'uno' });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si monto es 0', async () => {
    const resultado = await validateCrearPago({ ...baseDto, monto: 0 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si monto es negativo', async () => {
    const resultado = await validateCrearPago({ ...baseDto, monto: -50 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si metodo es string vacío', async () => {
    const resultado = await validateCrearPago({ ...baseDto, metodo: '' });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si metodo está ausente', async () => {
    const resultado = await validateCrearPago({ id_orden: 1, monto: 100 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si el tipo de pago no existe en BD', async () => {
    mockSupabase.from().select().maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const resultado = await validateCrearPago(baseDto);
    expect(resultado.error).toMatch(/no está registrado/i);
  });

  it('debería retornar error si la BD falla al validar tipo de pago', async () => {
    mockSupabase.from().select().maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Error de conexión' },
    });

    const resultado = await validateCrearPago(baseDto);
    expect(resultado.error).toMatch(/error al validar/i);
  });

  it('debería retornar error si propina es negativa', async () => {
    mockSupabase.from().select().maybeSingle.mockResolvedValueOnce({
      data: { id_tipo_pago: 1 },
      error: null,
    });

    const resultado = await validateCrearPago({ ...baseDto, propina: -5 });
    expect(resultado.error).toBeDefined();
  });
});
