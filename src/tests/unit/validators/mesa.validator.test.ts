import {
  validateCrearMesa,
  validateActualizarMesa,
} from '../../../domain/validators/mesa.validator';

describe('validateCrearMesa', () => {

  // ✅ CASOS CORRECTOS
  it('debería retornar data con campos válidos', () => {
    const resultado = validateCrearMesa({ id_zona: 1, numero: 5, capacidad: 4 });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.id_zona).toBe(1);
    expect(resultado.data?.numero).toBe(5);
    expect(resultado.data?.capacidad).toBe(4);
  });

  it('debería aceptar capacidad mínima de 1', () => {
    const resultado = validateCrearMesa({ id_zona: 1, numero: 1, capacidad: 1 });
    expect(resultado.error).toBeUndefined();
  });

  // ❌ CASOS DE ERROR
  it('debería retornar error si id_zona es undefined', () => {
    const resultado = validateCrearMesa({ numero: 1, capacidad: 4 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si id_zona es 0', () => {
    const resultado = validateCrearMesa({ id_zona: 0, numero: 1, capacidad: 4 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si id_zona es negativo', () => {
    const resultado = validateCrearMesa({ id_zona: -1, numero: 1, capacidad: 4 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si id_zona no es entero', () => {
    const resultado = validateCrearMesa({ id_zona: 1.5, numero: 1, capacidad: 4 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si numero es 0', () => {
    const resultado = validateCrearMesa({ id_zona: 1, numero: 0, capacidad: 4 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si numero es negativo', () => {
    const resultado = validateCrearMesa({ id_zona: 1, numero: -5, capacidad: 4 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si capacidad es 0', () => {
    const resultado = validateCrearMesa({ id_zona: 1, numero: 1, capacidad: 0 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si capacidad es negativa', () => {
    const resultado = validateCrearMesa({ id_zona: 1, numero: 1, capacidad: -2 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si body es null', () => {
    const resultado = validateCrearMesa(null);
    expect(resultado.error).toBeDefined();
  });
});

describe('validateActualizarMesa', () => {

  // ✅ CASOS CORRECTOS
  it('debería retornar data vacía si no se envía ningún campo', () => {
    const resultado = validateActualizarMesa({});
    expect(resultado.error).toBeUndefined();
    expect(resultado.data).toBeDefined();
  });

  it('debería retornar data solo con capacidad', () => {
    const resultado = validateActualizarMesa({ capacidad: 6 });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.capacidad).toBe(6);
  });

  it('debería retornar data con todos los campos', () => {
    const resultado = validateActualizarMesa({ id_zona: 2, numero: 10, capacidad: 8 });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.id_zona).toBe(2);
    expect(resultado.data?.numero).toBe(10);
    expect(resultado.data?.capacidad).toBe(8);
  });

  // ❌ CASOS DE ERROR
  it('debería retornar error si id_zona es 0', () => {
    const resultado = validateActualizarMesa({ id_zona: 0 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si id_zona no es entero', () => {
    const resultado = validateActualizarMesa({ id_zona: 2.5 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si numero es negativo', () => {
    const resultado = validateActualizarMesa({ numero: -1 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si capacidad es 0', () => {
    const resultado = validateActualizarMesa({ capacidad: 0 });
    expect(resultado.error).toBeDefined();
  });
});
