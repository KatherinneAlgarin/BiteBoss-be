import { AuthController } from '../../../presentation/auth/auth.controller';
import { AppError } from '../../../helpers/app-error';

jest.mock('../../../domain/validators/auth.validator', () => ({
  validateOlvidarContrasena: jest.fn(),
}));

const authValidator = require('../../../domain/validators/auth.validator');

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: any;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService = { olvidarContrasena: jest.fn() };
    controller = new AuthController(mockAuthService);
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    authValidator.validateOlvidarContrasena.mockReturnValue({
      data: { email: 'test@test.com' },
      error: null,
    });
  });

  describe('me', () => {
    it('debería retornar el usuario del request', () => {
      const req = { usuario: { id_usuario: 1, nombre: 'Ana' } } as any;
      controller.me(req, res);
      expect(res.json).toHaveBeenCalledWith({ usuario: req.usuario });
    });
  });

  describe('olvidarContrasena', () => {
    it('debería retornar 400 si la validación falla', async () => {
      authValidator.validateOlvidarContrasena.mockReturnValue({ data: null, error: 'Email requerido' });
      const req = { body: {} } as any;
      await controller.olvidarContrasena(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Email requerido' });
    });

    it('debería retornar mensaje de éxito si el email es válido', async () => {
      mockAuthService.olvidarContrasena.mockResolvedValueOnce(undefined);
      const req = { body: { email: 'test@test.com' } } as any;
      await controller.olvidarContrasena(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ mensaje: expect.any(String) })
      );
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockAuthService.olvidarContrasena.mockRejectedValueOnce(new AppError('Error externo', 400));
      const req = { body: { email: 'test@test.com' } } as any;
      await controller.olvidarContrasena(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería responder 500 ante error inesperado', async () => {
      mockAuthService.olvidarContrasena.mockRejectedValueOnce(new Error('boom'));
      const req = { body: { email: 'test@test.com' } } as any;
      await controller.olvidarContrasena(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
