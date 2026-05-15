import { validateCrearUsuario, validateActualizarPerfil } from '../../../domain/validators/usuario.validator';

describe('usuario.validator', () => {
  describe('validateCrearUsuario', () => {
    
    // ✅ CASOS CORRECTOS
    it('debería validar un usuario correcto', () => {
      const result = validateCrearUsuario({
        nombre: 'Juan Pérez',
        email: 'juan@example.com',
        password: 'tempPass123',
        id_rol: 1,
        id_sucursal: 1,
      });

      expect(result.data).toBeDefined();
      expect(result.data?.nombre).toBe('Juan Pérez');
      expect(result.data?.email).toBe('juan@example.com');
      expect(result.error).toBeUndefined();
    });

    it('debería convertir email a minúsculas y eliminar espacios', () => {
      const result = validateCrearUsuario({
        nombre: 'Maria Garcia',
        email: '  MARIA@EXAMPLE.COM  ',
        password: 'tempPass123',
        id_rol: 2,
        id_sucursal: 1,
      });

        expect(result.data?.email).toBe('maria@example.com');
    });

    it('debería aceptar id_rol y id_sucursal positivos', () => {
      const result = validateCrearUsuario({
        nombre: 'Pedro Lopez',
        email: 'pedro@example.com',
        password: 'tempPass123',
        id_rol: 5,
        id_sucursal: 10,
      });

      expect(result.data?.id_rol).toBe(5);
      expect(result.data?.id_sucursal).toBe(10);
      expect(result.error).toBeUndefined();
    });

    // ❌ CASOS DE ERROR - NOMBRE
    it('debería rechazar nombre vacío', () => {
      const result = validateCrearUsuario({
        nombre: '',
        email: 'test@example.com',
        password: 'tempPass123',
        id_rol: 1,
        id_sucursal: 1,
      });

      expect(result.error).toContain('El nombre es requerido');
    });

    it('debería rechazar nombre con menos de 2 caracteres', () => {
      const result = validateCrearUsuario({
        nombre: 'A',
        email: 'test@example.com',
        password: 'tempPass123',
        id_rol: 1,
        id_sucursal: 1,
      });

      expect(result.error).toContain('El nombre es requerido');
    });

    it('debería rechazar si nombre no es string', () => {
      const result = validateCrearUsuario({
        nombre: 123,
        email: 'test@example.com',
        password: 'tempPass123',
        id_rol: 1,
        id_sucursal: 1,
      });

      expect(result.error).toContain('El nombre es requerido');
    });

    // ❌ CASOS DE ERROR - EMAIL
    it('debería rechazar email inválido', () => {
      const result = validateCrearUsuario({
        nombre: 'Test User',
        email: 'emailsinformato',
        password: 'tempPass123',
        id_rol: 1,
        id_sucursal: 1,
      });

      expect(result.error).toContain('no tiene un formato válido');
    });

    it('debería rechazar si email no es string', () => {
      const result = validateCrearUsuario({
        nombre: 'Test User',
        email: 123,
        password: 'tempPass123',
        id_rol: 1,
        id_sucursal: 1,
      });

      expect(result.error).toContain('El email es requerido');
    });

    // ❌ CASOS DE ERROR - PASSWORD
    it('debería rechazar contraseña vacía', () => {
      const result = validateCrearUsuario({
        nombre: 'Test User',
        email: 'test@example.com',
        password: '',
        id_rol: 1,
        id_sucursal: 1,
      });

      expect(result.error).toContain('La contraseña temporal es requerida');
    });

    it('debería rechazar contraseña con menos de 6 caracteres', () => {
      const result = validateCrearUsuario({
        nombre: 'Test User',
        email: 'test@example.com',
        password: 'pass',
        id_rol: 1,
        id_sucursal: 1,
      });

      expect(result.error).toContain('La contraseña debe tener al menos 6 caracteres');
    });

    // ❌ CASOS DE ERROR - ROLES Y SUCURSAL
    it('debería rechazar id_rol inválido (negativo)', () => {
      const result = validateCrearUsuario({
        nombre: 'Test User',
        email: 'test@example.com',
        password: 'tempPass123',
        id_rol: -1,
        id_sucursal: 1,
      });

      expect(result.error).toContain('El rol es requerido');
    });

    it('debería rechazar id_rol cero', () => {
      const result = validateCrearUsuario({
        nombre: 'Test User',
        email: 'test@example.com',
        password: 'tempPass123',
        id_rol: 0,
        id_sucursal: 1,
      });

      expect(result.error).toContain('El rol es requerido');
    });

    it('debería rechazar id_sucursal inválido (negativo)', () => {
      const result = validateCrearUsuario({
        nombre: 'Test User',
        email: 'test@example.com',
        password: 'tempPass123',
        id_rol: 1,
        id_sucursal: -5,
      });

      expect(result.error).toContain('La sucursal es requerida');
    });

    it('debería rechazar si body es null o undefined', () => {
      const result = validateCrearUsuario(null);

      expect(result.error).toBeDefined();
    });
  });

  describe('validateActualizarPerfil', () => {
    
    // ✅ CASOS CORRECTOS
    it('debería validar actualización solo de nombre', () => {
      const result = validateActualizarPerfil({
        nombre: 'Nuevo Nombre',
      });

      expect(result.data).toBeDefined();
      expect(result.data?.nombre).toBe('Nuevo Nombre');
      expect(result.error).toBeUndefined();
    });

    it('debería validar actualización solo de contraseña', () => {
      const result = validateActualizarPerfil({
        nuevaContrasena: 'NewPass123',
      });

      expect(result.data).toBeDefined();
      expect(result.data?.nuevaContrasena).toBe('NewPass123');
      expect(result.error).toBeUndefined();
    });

    it('debería validar actualización de ambos campos', () => {
      const result = validateActualizarPerfil({
        nombre: 'Nuevo Nombre',
        nuevaContrasena: 'NewPass456',
      });

      expect(result.data?.nombre).toBe('Nuevo Nombre');
      expect(result.data?.nuevaContrasena).toBe('NewPass456');
      expect(result.error).toBeUndefined();
    });

    // ❌ CASOS DE ERROR
    it('debería rechazar si no hay campos para actualizar', () => {
      const result = validateActualizarPerfil({});

      expect(result.error).toContain('Debe proporcionar al menos un campo para actualizar');
    });

    it('debería rechazar nombre con menos de 2 caracteres', () => {
      const result = validateActualizarPerfil({
        nombre: 'A',
      });

      expect(result.error).toContain('El nombre debe tener al menos 2 caracteres');
    });

    it('debería rechazar contraseña débil (sin mayúscula)', () => {
      const result = validateActualizarPerfil({
        nuevaContrasena: 'newpass123',
      });

      expect(result.error).toContain('La contraseña debe tener al menos 8 caracteres');
    });

    it('debería rechazar contraseña débil (sin minúscula)', () => {
      const result = validateActualizarPerfil({
        nuevaContrasena: 'NEWPASS123',
      });

      expect(result.error).toContain('La contraseña debe tener al menos 8 caracteres');
    });

    it('debería rechazar contraseña débil (sin número)', () => {
      const result = validateActualizarPerfil({
        nuevaContrasena: 'NewPassword',
      });

      expect(result.error).toContain('La contraseña debe tener al menos 8 caracteres');
    });

    it('debería rechazar contraseña menor a 8 caracteres', () => {
      const result = validateActualizarPerfil({
        nuevaContrasena: 'Pass12',
      });

      expect(result.error).toContain('La contraseña debe tener al menos 8 caracteres');
    });

    it('debería aceptar contraseña válida fuerte', () => {
      const result = validateActualizarPerfil({
        nuevaContrasena: 'StrongPass123',
      });

      expect(result.data?.nuevaContrasena).toBe('StrongPass123');
      expect(result.error).toBeUndefined();
    });
  });
});