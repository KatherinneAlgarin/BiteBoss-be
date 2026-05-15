import {
  validateCrearTipoOrden,
  validateActualizarTipoOrden,
} from '../../../domain/validators/tipo-orden.validator';

describe('validateCrearTipoOrden', () => {

  // ✅ CASOS CORRECTOS
  it('debería retornar data con nombre válido sin padre', () => {
    const resultado = validateCrearTipoOrden({ nombre: 'Para llevar' });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.nombre).toBe('Para llevar');
    expect(resultado.data?.id_tipo_orden_padre).toBeNull();
    expect(resultado.data?.requiere_mesa).toBe(false);
  });

  it('debería retornar data con padre y requiere_mesa', () => {
    const resultado = validateCrearTipoOrden({
      nombre: 'Mesa VIP',
      id_tipo_orden_padre: 2,
      requiere_mesa: true,
    });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.id_tipo_orden_padre).toBe(2);
    expect(resultado.data?.requiere_mesa).toBe(true);
  });

  it('debería recortar espacios del nombre', () => {
    const resultado = validateCrearTipoOrden({ nombre: '  Domicilio  ' });
    expect(resultado.data?.nombre).toBe('Domicilio');
  });

  it('debería aceptar id_tipo_orden_padre null', () => {
    const resultado = validateCrearTipoOrden({ nombre: 'Local', id_tipo_orden_padre: null });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.id_tipo_orden_padre).toBeNull();
  });

  // ❌ CASOS DE ERROR
  it('debería retornar error si nombre está ausente', () => {
    const resultado = validateCrearTipoOrden({});
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si nombre es string vacío', () => {
    const resultado = validateCrearTipoOrden({ nombre: '' });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si id_tipo_orden_padre es negativo', () => {
    const resultado = validateCrearTipoOrden({ nombre: 'Test', id_tipo_orden_padre: -1 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si id_tipo_orden_padre es 0', () => {
    const resultado = validateCrearTipoOrden({ nombre: 'Test', id_tipo_orden_padre: 0 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si id_tipo_orden_padre no es entero', () => {
    const resultado = validateCrearTipoOrden({ nombre: 'Test', id_tipo_orden_padre: 1.5 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si requiere_mesa no es booleano', () => {
    const resultado = validateCrearTipoOrden({ nombre: 'Test', requiere_mesa: 'si' });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si body es null', () => {
    const resultado = validateCrearTipoOrden(null);
    expect(resultado.error).toBeDefined();
  });
});

describe('validateActualizarTipoOrden', () => {

  // ✅ CASOS CORRECTOS
  it('debería retornar data vacía si no se envía ningún campo', () => {
    const resultado = validateActualizarTipoOrden({});
    expect(resultado.error).toBeUndefined();
    expect(resultado.data).toBeDefined();
  });

  it('debería retornar data solo con nombre', () => {
    const resultado = validateActualizarTipoOrden({ nombre: 'Nuevo Nombre' });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.nombre).toBe('Nuevo Nombre');
  });

  it('debería retornar data con requiere_mesa false', () => {
    const resultado = validateActualizarTipoOrden({ requiere_mesa: false });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.requiere_mesa).toBe(false);
  });

  it('debería retornar data con id_tipo_orden_padre null', () => {
    const resultado = validateActualizarTipoOrden({ id_tipo_orden_padre: null });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.id_tipo_orden_padre).toBeNull();
  });

  // ❌ CASOS DE ERROR
  it('debería retornar error si nombre es string vacío', () => {
    const resultado = validateActualizarTipoOrden({ nombre: '' });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si id_tipo_orden_padre es negativo', () => {
    const resultado = validateActualizarTipoOrden({ id_tipo_orden_padre: -5 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si requiere_mesa no es booleano', () => {
    const resultado = validateActualizarTipoOrden({ requiere_mesa: 1 });
    expect(resultado.error).toBeDefined();
  });
});
