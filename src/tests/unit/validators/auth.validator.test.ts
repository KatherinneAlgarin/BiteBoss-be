import { validateOlvidarContrasena } from '../../../domain/validators/auth.validator';

describe('auth.validator', () => {
  describe('validateOlvidarContrasena', () => {
    
    // ✅ CASOS CORRECTOS
    it('debería validar un email correcto', () => {
      const result = validateOlvidarContrasena({
        email: 'usuario@example.com',
      });

      expect(result.data).toBeDefined();
      expect(result.data?.email).toBe('usuario@example.com');
      expect(result.error).toBeUndefined();
    });

    it('debería convertir email a minúsculas', () => {
      const result = validateOlvidarContrasena({
        email: 'USUARIO@EXAMPLE.COM',
      });

      expect(result.data?.email).toBe('usuario@example.com');
    });

    it('debería eliminar espacios en blanco del email', () => {
      const result = validateOlvidarContrasena({
        email: '  usuario@example.com  ',
      });

        expect(result.data?.email).toBe('usuario@example.com');
    });

    // ❌ CASOS DE ERROR
    it('debería rechazar un email sin formato válido', () => {
      const result = validateOlvidarContrasena({
        email: 'emailsinformato',
      });

      expect(result.error).toBeDefined();
      expect(result.error).toContain('no tiene un formato válido');
      expect(result.data).toBeUndefined();
    });

    it('debería rechazar un email vacío', () => {
      const result = validateOlvidarContrasena({
        email: '',
      });

      expect(result.error).toBeDefined();
      expect(result.error).toContain('El email es requerido');
    });

    it('debería rechazar si email no es string', () => {
      const result = validateOlvidarContrasena({
        email: 123,
      });

      expect(result.error).toBeDefined();
      expect(result.error).toContain('El email es requerido');
    });

    it('debería rechazar si no hay email en el body', () => {
      const result = validateOlvidarContrasena({});

      expect(result.error).toBeDefined();
      expect(result.error).toContain('El email es requerido');
    });

    it('debería rechazar si body es null o undefined', () => {
      const result = validateOlvidarContrasena(null);

      expect(result.error).toBeDefined();
      expect(result.error).toContain('El email es requerido');
    });

    // 🔍 CASOS EDGE
    it('debería rechazar un email con @ duplicado', () => {
      const result = validateOlvidarContrasena({
        email: 'usuario@@example.com',
      });

      expect(result.error).toBeDefined();
    });

    it('debería rechazar un email sin dominio', () => {
      const result = validateOlvidarContrasena({
        email: 'usuario@.com',
      });

      expect(result.error).toBeDefined();
    });
  });
});