import {
  validateCrearProveedor,
  validateActualizarProveedor,
} from '../../../domain/validators/proveedor.validator';

describe('validateCrearProveedor', () => {

  const baseDto = {
    nombre: 'Proveedor ABC',
    email: 'contacto@abc.com',
    telefono: '1234-5678',
    direccion: 'Calle 1',
    activo: true,
  };

  // ✅ CASOS CORRECTOS
  it('debería retornar data con email y teléfono', () => {
    const resultado = validateCrearProveedor(baseDto);
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.nombre).toBe('Proveedor ABC');
    expect(resultado.data?.email).toBe('contacto@abc.com');
    expect(resultado.data?.telefono).toBe('1234-5678');
    expect(resultado.data?.activo).toBe(true);
  });

  it('debería retornar data solo con teléfono (sin email)', () => {
    const resultado = validateCrearProveedor({ nombre: 'Prov', telefono: '9999-0000', activo: true });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.email).toBeUndefined();
    expect(resultado.data?.telefono).toBe('9999-0000');
  });

  it('debería retornar data solo con email (sin teléfono)', () => {
    const resultado = validateCrearProveedor({ nombre: 'Prov', email: 'x@y.com', activo: true });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.email).toBe('x@y.com');
    expect(resultado.data?.telefono).toBeUndefined();
  });

  it('debería usar activo=true por defecto si no se envía', () => {
    const resultado = validateCrearProveedor({ nombre: 'Prov', email: 'a@b.com' });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.activo).toBe(true);
  });

  it('debería recortar espacios del nombre', () => {
    const resultado = validateCrearProveedor({ nombre: '  ABC Corp  ', email: 'a@b.com', activo: true });
    expect(resultado.data?.nombre).toBe('ABC Corp');
  });

  // ❌ CASOS DE ERROR
  it('debería retornar error si nombre está ausente', () => {
    const resultado = validateCrearProveedor({ email: 'a@b.com', activo: true });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si nombre es string vacío', () => {
    const resultado = validateCrearProveedor({ nombre: '', email: 'a@b.com', activo: true });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si no tiene email ni teléfono', () => {
    const resultado = validateCrearProveedor({ nombre: 'Prov', activo: true });
    expect(resultado.error).toMatch(/contacto/i);
  });

  it('debería retornar error si email tiene formato inválido', () => {
    const resultado = validateCrearProveedor({ nombre: 'Prov', email: 'correo-invalido', activo: true });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si activo no es booleano', () => {
    const resultado = validateCrearProveedor({ nombre: 'Prov', email: 'a@b.com', activo: 'true' });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si body es null', () => {
    const resultado = validateCrearProveedor(null);
    expect(resultado.error).toBeDefined();
  });
});

describe('validateActualizarProveedor', () => {

  // ✅ CASOS CORRECTOS
  it('debería retornar data vacía si no se envía ningún campo', () => {
    const resultado = validateActualizarProveedor({});
    expect(resultado.error).toBeUndefined();
    expect(resultado.data).toBeDefined();
  });

  it('debería retornar data solo con nombre', () => {
    const resultado = validateActualizarProveedor({ nombre: 'Nuevo Nombre' });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.nombre).toBe('Nuevo Nombre');
  });

  it('debería retornar data con activo false', () => {
    const resultado = validateActualizarProveedor({ activo: false });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.activo).toBe(false);
  });

  it('debería retornar data con email válido', () => {
    const resultado = validateActualizarProveedor({ email: 'nuevo@proveedor.com' });
    expect(resultado.error).toBeUndefined();
    expect(resultado.data?.email).toBe('nuevo@proveedor.com');
  });

  // ❌ CASOS DE ERROR
  it('debería retornar error si nombre es string vacío', () => {
    const resultado = validateActualizarProveedor({ nombre: '' });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si email está vacío (string vacío)', () => {
    const resultado = validateActualizarProveedor({ email: '' });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si email tiene formato inválido', () => {
    const resultado = validateActualizarProveedor({ email: 'no-es-email' });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si telefono no es string', () => {
    const resultado = validateActualizarProveedor({ telefono: 123456 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si activo no es booleano', () => {
    const resultado = validateActualizarProveedor({ activo: 1 });
    expect(resultado.error).toBeDefined();
  });

  it('debería retornar error si se envía email y teléfono vacíos sin otro contacto', () => {
    const resultado = validateActualizarProveedor({ email: '  ', telefono: '  ' });
    expect(resultado.error).toBeDefined();
  });
});
