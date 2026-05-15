import { TipoPagoController } from '../../../presentation/tipo-pago/tipo-pago.controller';
import { AppError } from '../../../helpers/app-error';

describe('TipoPagoController', () => {
  let controller: TipoPagoController;
  let mockTipoPagoService: any;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTipoPagoService = { listar: jest.fn() };
    controller = new TipoPagoController(mockTipoPagoService);
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  describe('listar', () => {
    it('debería retornar los tipos de pago', async () => {
      const tipos = [{ id_tipo_pago: 1, nombre: 'EFECTIVO' }];
      mockTipoPagoService.listar.mockResolvedValueOnce(tipos);
      await controller.listar({} as any, res);
      expect(res.json).toHaveBeenCalledWith(tipos);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockTipoPagoService.listar.mockRejectedValueOnce(new AppError('Error de BD', 500));
      await controller.listar({} as any, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Error de BD' });
    });

    it('debería responder 500 ante error inesperado', async () => {
      mockTipoPagoService.listar.mockRejectedValueOnce(new Error('boom'));
      await controller.listar({} as any, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Error interno del servidor' });
    });
  });
});
