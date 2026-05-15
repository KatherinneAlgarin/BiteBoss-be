import {
  validateCrearSucursal,
  validateActualizarSucursal,
} from '../../../domain/validators/sucursal.validator';

describe('validateCrearSucursal', () => {

  const baseDto = {
    nombre: 'Sucursal Centro',
    direccion: 'Av. Principal 123',
    tipos_orden: [1, 2],
    tipos_pago: [3],
  };

  // ✅ CASOS CORRECTOS
  it('debería retornar data con todos los campos válidos', () => {
    const resultado = validateCrearSucursal(baseDto);
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.nombre).toBe('Sucursal Centro');
    expect(resultado.data?.tipos_orden).toEqual([1, 2]);
    expect(resultado.data?.tipos_pago).toEqual([3]);
  });

  it('debería retornar data sin dirección', () => {
    const resultado = validateCrearSucursal({ ...baseDto, direccion: undefined });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.direccion).toBeNull();
  });

  it('debería recortar espacios del nombre', () => {
    const resultado = validateCrearSucursal({ ...baseDto, nombre: '  Sucursal Norte  ' });
    expect(resultado.data?.nombre).toBe('Sucursal Norte');
  });

  // ❌ CASOS DE ERROR
  it('debería retornar error si nombre está vacío', () => {
    const resultado = validateCrearSucursal({ ...baseDto, nombre: '' });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si nombre es undefined', () => {
    const resultado = validateCrearSucursal({ ...baseDto, nombre: undefined });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si direccion no es string', () => {
    const resultado = validateCrearSucursal({ ...baseDto, direccion: 123 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si tipos_orden no es array', () => {
    const resultado = validateCrearSucursal({ ...baseDto, tipos_orden: 1 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si tipos_orden está vacío', () => {
    const resultado = validateCrearSucursal({ ...baseDto, tipos_orden: [] });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si tipos_orden contiene ids inválidos', () => {
    const resultado = validateCrearSucursal({ ...baseDto, tipos_orden: [1, -2] });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si tipos_pago no es array', () => {
    const resultado = validateCrearSucursal({ ...baseDto, tipos_pago: 'efectivo' });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si tipos_pago está vacío', () => {
    const resultado = validateCrearSucursal({ ...baseDto, tipos_pago: [] });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si tipos_pago contiene ids no enteros', () => {
    const resultado = validateCrearSucursal({ ...baseDto, tipos_pago: [1.5] });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si body es null', () => {
    const resultado = validateCrearSucursal(null);
    expect(resultado.error).toBeDefined();
  });
});

describe('validateActualizarSucursal', () => {

  // ✅ CASOS CORRECTOS
  it('debería retornar data vacía si no se envía ningún campo', () => {
    const resultado = validateActualizarSucursal({});
    expect(resultado.error).toBeUndefined();
    expect(resultado.data).toBeDefined();
  });

  it('debería retornar data solo con nombre', () => {
    const resultado = validateActualizarSucursal({ nombre: 'Nuevo Nombre' });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.nombre).toBe('Nuevo Nombre');
  });

  it('debería retornar data con tipos_orden actualizados', () => {
    const resultado = validateActualizarSucursal({ tipos_orden: [1, 2, 3] });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.tipos_orden).toEqual([1, 2, 3]);
  });

  // ❌ CASOS DE ERROR
  it('debería retornar error si nombre es string vacío', () => {
    const resultado = validateActualizarSucursal({ nombre: '' });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si tipos_orden es array vacío', () => {
    const resultado = validateActualizarSucursal({ tipos_orden: [] });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si tipos_pago es array vacío', () => {
    const resultado = validateActualizarSucursal({ tipos_pago: [] });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si tipos_orden contiene ids inválidos', () => {
    const resultado = validateActualizarSucursal({ tipos_orden: [0] });
    expect(resultado.error).toBeDefined();
  });
});
