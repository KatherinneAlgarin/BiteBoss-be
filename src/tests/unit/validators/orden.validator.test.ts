import {
  validateCrearOrdenDetalle,
  validateActualizarOrden,
  validateActualizarOrdenDetalle,
} from '../../../domain/validators/orden.validator';

describe('validateCrearOrdenDetalle', () => {

  // ✅ CASOS CORRECTOS
  it('debería retornar data con campos válidos', () => {
    const resultado = validateCrearOrdenDetalle({ id_producto: 1, cantidad: 2, nota: 'sin cebolla' });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.id_producto).toBe(1);
    expect(resultado.data?.cantidad).toBe(2);
    expect(resultado.data?.nota).toBe('sin cebolla');
  });

  it('debería retornar data sin nota', () => {
    const resultado = validateCrearOrdenDetalle({ id_producto: 3, cantidad: 1 });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.nota).toBeUndefined();
  });

  it('debería recortar espacios de la nota', () => {
    const resultado = validateCrearOrdenDetalle({ id_producto: 1, cantidad: 1, nota: '  extra sal  ' });
    expect(resultado.data?.nota).toBe('extra sal');
  });

  // ❌ CASOS DE ERROR
  it('debería retornar error si id_producto es undefined', () => {
    const resultado = validateCrearOrdenDetalle({ cantidad: 2 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si id_producto no es número', () => {
    const resultado = validateCrearOrdenDetalle({ id_producto: '1', cantidad: 2 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si cantidad es 0', () => {
    const resultado = validateCrearOrdenDetalle({ id_producto: 1, cantidad: 0 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si cantidad es negativa', () => {
    const resultado = validateCrearOrdenDetalle({ id_producto: 1, cantidad: -3 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si nota no es string', () => {
    const resultado = validateCrearOrdenDetalle({ id_producto: 1, cantidad: 1, nota: 123 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si body es null', () => {
    const resultado = validateCrearOrdenDetalle(null);
    expect(resultado.error).toBeDefined();
  });
});

describe('validateActualizarOrden', () => {

  // ✅ CASOS CORRECTOS
  it('debería retornar data vacía si no se envía ningún campo', () => {
    const resultado = validateActualizarOrden({});
    expect(resultado.error).toBeUndefined();
    expect(resultado.data).toBeDefined();
  });

  it('debería retornar data con estado_operativo válido', () => {
    const resultado = validateActualizarOrden({ estado_operativo: 'ABIERTO' });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.estado_operativo).toBe('ABIERTO');
  });

  it('debería retornar data con tipo_orden válido', () => {
    const resultado = validateActualizarOrden({ tipo_orden: 'MESA' });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.tipo_orden).toBe('MESA');
  });

  it('debería retornar data con nombre y apellido del cliente', () => {
    const resultado = validateActualizarOrden({ nombre_cliente: 'Ana', apellido_cliente: 'García' });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.nombre_cliente).toBe('Ana');
    expect(resultado.data?.apellido_cliente).toBe('García');
  });

  it('debería retornar data con id_mesa válido', () => {
    const resultado = validateActualizarOrden({ id_mesa: 5 });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.id_mesa).toBe(5);
  });

  // ❌ CASOS DE ERROR
  it('debería retornar error si tipo_orden es string vacío', () => {
    const resultado = validateActualizarOrden({ tipo_orden: '' });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si id_mesa no es número', () => {
    const resultado = validateActualizarOrden({ id_mesa: 'cinco' });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si estado_operativo es inválido', () => {
    const resultado = validateActualizarOrden({ estado_operativo: 'INVALIDO' });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si nombre_cliente es string vacío', () => {
    const resultado = validateActualizarOrden({ nombre_cliente: '' });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si apellido_cliente es string vacío', () => {
    const resultado = validateActualizarOrden({ apellido_cliente: '   ' });
    expect(resultado.error).toBeDefined();
  });
});

describe('validateActualizarOrdenDetalle', () => {

  // ✅ CASOS CORRECTOS
  it('debería retornar data vacía si no se envía ningún campo', () => {
    const resultado = validateActualizarOrdenDetalle({});
    expect(resultado.error).toBeUndefined();
    expect(resultado.data).toBeDefined();
  });

  it('debería retornar data con cantidad válida', () => {
    const resultado = validateActualizarOrdenDetalle({ cantidad: 3 });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.cantidad).toBe(3);
  });

  it('debería retornar data con estado_linea válido', () => {
    const resultado = validateActualizarOrdenDetalle({ estado_linea: 'ENTREGADO' });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.estado_linea).toBe('ENTREGADO');
  });

  it('debería retornar data con nota recortada', () => {
    const resultado = validateActualizarOrdenDetalle({ nota: '  extra queso  ' });
    expect(resultado.data?.nota).toBe('extra queso');
  });

  // ❌ CASOS DE ERROR
  it('debería retornar error si cantidad es negativa', () => {
    const resultado = validateActualizarOrdenDetalle({ cantidad: -1 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si cantidad es 0', () => {
    const resultado = validateActualizarOrdenDetalle({ cantidad: 0 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si nota no es string', () => {
    const resultado = validateActualizarOrdenDetalle({ nota: 99 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si estado_linea es inválido', () => {
    const resultado = validateActualizarOrdenDetalle({ estado_linea: 'INVALIDO' });
    expect(resultado.error).toBeDefined();
  });
});
