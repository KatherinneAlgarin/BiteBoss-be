import { AuthService } from '../../../services/auth.service';
import { AppError } from '../../../helpers/app-error';

jest.mock('../../../config/supabase', () => ({
  __esModule: true,
  default: { from: jest.fn(), auth: { admin: {} } },
  supabaseAuth: {
    auth: {
      resetPasswordForEmail: jest.fn(),
    },
  },
}));

jest.mock('../../../config/envs', () => ({
  envs: {
    FRONTEND_URL: 'http://localhost:3000',
    SUPABASE_URL: 'http://test',
    SUPABASE_ANON_KEY: 'anon',
    SUPABASE_SERVICE_ROLE_KEY: 'service',
  },
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockResetPasswordForEmail: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const { supabaseAuth } = require('../../../config/supabase');
    mockResetPasswordForEmail = supabaseAuth.auth.resetPasswordForEmail;
    authService = new AuthService();
  });

  describe('olvidarContrasena', () => {

    // ✅ CASOS CORRECTOS
    it('debería completar sin error cuando supabase responde correctamente', async () => {
      mockResetPasswordForEmail.mockResolvedValueOnce({ error: null });

      await expect(authService.olvidarContrasena({ email: 'usuario@example.com' }))
        .resolves.toBeUndefined();

      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'usuario@example.com',
        { redirectTo: 'http://localhost:3000/reset-password' }
      );
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si supabase retorna error', async () => {
      mockResetPasswordForEmail.mockResolvedValueOnce({
        error: { message: 'Email not found' },
      });

      await expect(authService.olvidarContrasena({ email: 'noexiste@example.com' }))
        .rejects.toThrow(new AppError('Error al procesar la solicitud', 500));
    });
  });
});
