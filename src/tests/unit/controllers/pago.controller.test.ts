import { PagoController } from '../../../presentation/pago/pago.controller';
import { AppError } from '../../../helpers/app-error';

jest.mock('../../../domain/validators/pago.validator', () => ({
  validateCrearPago: jest.fn(),
}));

const pagoValidator = require('../../../domain/validators/pago.validator');

const pagoBase = { id_pago: 1, id_pedido: 1, monto: 50, estado: 'APROBADO' };
const metodoBase = { id_tipo_pago: 1, nombre: 'EFECTIVO' };
const usuarioMock = { id_usuario: 1, id_sucursal: 1, rol: 'cajero' };

describe('PagoController', () => {
  let controller: PagoController;
  let mockPagoService: any;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPagoService = {
      listarMetodosPago: jest.fn(),
      crearPago: jest.fn(),
      listarPagosOrden: jest.fn(),
      actualizarEstadoPago: jest.fn(),
    };
    controller = new PagoController(mockPagoService);
    res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
    pagoValidator.validateCrearPago.mockResolvedValue({
      data: { id_pedido: 1, id_tipo_pago: 1, monto: 50, propina: 0, metodo_referencia: null },
      error: null,
    });
  });

  describe('listarMetodosPago', () => {
    it('debería listar los métodos de pago de la sucursal', async () => {
      mockPagoService.listarMetodosPago.mockResolvedValueOnce([metodoBase]);
      const req = { usuario: usuarioMock } as any;
      await controller.listarMetodosPago(req, res);
      expect(res.json).toHaveBeenCalledWith([metodoBase]);
      expect(mockPagoService.listarMetodosPago).toHaveBeenCalledWith(usuarioMock.id_sucursal);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockPagoService.listarMetodosPago.mockRejectedValueOnce(new AppError('Error', 500));
      const req = { usuario: usuarioMock } as any;
      await controller.listarMetodosPago(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('debería responder 500 ante error inesperado', async () => {
      mockPagoService.listarMetodosPago.mockRejectedValueOnce(new Error('boom'));
      const req = { usuario: usuarioMock } as any;
      await controller.listarMetodosPago(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('crearPago', () => {
    it('debería retornar 400 si la validación falla', async () => {
      pagoValidator.validateCrearPago.mockResolvedValueOnce({ data: null, error: 'Monto inválido' });
      const req = { body: { monto: -10 } } as any;
      await controller.crearPago(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Monto inválido' });
    });

    it('debería crear el pago y responder 201', async () => {
      mockPagoService.crearPago.mockResolvedValueOnce(pagoBase);
      const req = { body: { id_pedido: 1, id_tipo_pago: 1, monto: 50 } } as any;
      await controller.crearPago(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(pagoBase);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockPagoService.crearPago.mockRejectedValueOnce(new AppError('Pedido no encontrado', 404));
      const req = { body: {} } as any;
      await controller.crearPago(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debería responder 500 ante error inesperado', async () => {
      mockPagoService.crearPago.mockRejectedValueOnce(new Error('boom'));
      const req = { body: {} } as any;
      await controller.crearPago(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('listarPagosOrden', () => {
    it('debería retornar 400 si el id no es válido', async () => {
      const req = { params: { id: 'abc' } } as any;
      await controller.listarPagosOrden(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería listar los pagos de la orden', async () => {
      mockPagoService.listarPagosOrden.mockResolvedValueOnce([pagoBase]);
      const req = { params: { id: '1' } } as any;
      await controller.listarPagosOrden(req, res);
      expect(res.json).toHaveBeenCalledWith([pagoBase]);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockPagoService.listarPagosOrden.mockRejectedValueOnce(new AppError('Error', 500));
      const req = { params: { id: '1' } } as any;
      await controller.listarPagosOrden(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('actualizarEstadoPago', () => {
    it('debería retornar 400 si el id no es válido', async () => {
      const req = { params: { id: 'abc' }, body: { estado: 'APROBADO' } } as any;
      await controller.actualizarEstadoPago(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería retornar 400 si el estado no está en el body', async () => {
      const req = { params: { id: '1' }, body: {} } as any;
      await controller.actualizarEstadoPago(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Estado requerido' });
    });

    it('debería actualizar el estado del pago', async () => {
      const pagoActualizado = { ...pagoBase, estado: 'RECHAZADO' };
      mockPagoService.actualizarEstadoPago.mockResolvedValueOnce(pagoActualizado);
      const req = { params: { id: '1' }, body: { estado: 'RECHAZADO' } } as any;
      await controller.actualizarEstadoPago(req, res);
      expect(res.json).toHaveBeenCalledWith(pagoActualizado);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockPagoService.actualizarEstadoPago.mockRejectedValueOnce(new AppError('Pago no encontrado', 404));
      const req = { params: { id: '1' }, body: { estado: 'APROBADO' } } as any;
      await controller.actualizarEstadoPago(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
