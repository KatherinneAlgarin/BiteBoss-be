import {
  validateCrearZona,
  validateActualizarZona,
} from '../../../domain/validators/zona.validator';

describe('validateCrearZona', () => {

  // ✅ CASOS CORRECTOS
  it('debería retornar data con todos los campos', () => {
    const resultado = validateCrearZona({ id_sucursal: 1, nombre: 'Terraza', descripcion: 'Zona exterior' });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.id_sucursal).toBe(1);
    expect(resultado.data?.nombre).toBe('Terraza');
    expect(resultado.data?.descripcion).toBe('Zona exterior');
  });

  it('debería retornar data sin descripción', () => {
    const resultado = validateCrearZona({ id_sucursal: 1, nombre: 'Interior' });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.descripcion).toBeNull();
  });

  it('debería aceptar descripción null', () => {
    const resultado = validateCrearZona({ id_sucursal: 1, nombre: 'Bar', descripcion: null });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.descripcion).toBeNull();
  });

  it('debería recortar espacios del nombre', () => {
    const resultado = validateCrearZona({ id_sucursal: 1, nombre: '  Jardín  ' });
    expect(resultado.data?.nombre).toBe('Jardín');
  });

  // ❌ CASOS DE ERROR
  it('debería retornar error si id_sucursal es undefined', () => {
    const resultado = validateCrearZona({ nombre: 'Terraza' });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si id_sucursal es 0', () => {
    const resultado = validateCrearZona({ id_sucursal: 0, nombre: 'Terraza' });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si id_sucursal es negativo', () => {
    const resultado = validateCrearZona({ id_sucursal: -1, nombre: 'Terraza' });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si id_sucursal no es entero', () => {
    const resultado = validateCrearZona({ id_sucursal: 1.5, nombre: 'Terraza' });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si nombre está ausente', () => {
    const resultado = validateCrearZona({ id_sucursal: 1 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si nombre es string vacío', () => {
    const resultado = validateCrearZona({ id_sucursal: 1, nombre: '' });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si descripcion no es string', () => {
    const resultado = validateCrearZona({ id_sucursal: 1, nombre: 'Terraza', descripcion: 123 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si body es null', () => {
    const resultado = validateCrearZona(null);
    expect(resultado.error).toBeDefined();
  });
});

describe('validateActualizarZona', () => {

  // ✅ CASOS CORRECTOS
  it('debería retornar data vacía si no se envía ningún campo', () => {
    const resultado = validateActualizarZona({});
    expect(resultado.error).toBeUndefined();
    expect(resultado.data).toBeDefined();
  });

  it('debería retornar data solo con nombre', () => {
    const resultado = validateActualizarZona({ nombre: 'Nuevo Nombre' });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.nombre).toBe('Nuevo Nombre');
  });

  it('debería retornar data con descripcion null', () => {
    const resultado = validateActualizarZona({ descripcion: null });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.descripcion).toBeNull();
  });

  it('debería recortar espacios del nombre', () => {
    const resultado = validateActualizarZona({ nombre: '  Planta Alta  ' });
    expect(resultado.data?.nombre).toBe('Planta Alta');
  });

  // ❌ CASOS DE ERROR
  it('debería retornar error si nombre es string vacío', () => {
    const resultado = validateActualizarZona({ nombre: '' });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si nombre solo tiene espacios', () => {
    const resultado = validateActualizarZona({ nombre: '   ' });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si descripcion no es string', () => {
    const resultado = validateActualizarZona({ descripcion: 42 });
    expect(resultado.error).toBeDefined();
  });
});
