import { OrdenController } from '../../../presentation/orden/orden.controller';
import { AppError } from '../../../helpers/app-error';

jest.mock('../../../domain/validators/orden.validator', () => ({
  validateActualizarOrden: jest.fn(),
  validateCrearOrdenDetalle: jest.fn(),
  validateActualizarOrdenDetalle: jest.fn(),
}));

const ordenValidator = require('../../../domain/validators/orden.validator');

const ordenBase = { id_pedido: 1, total: 50, estado_operativo: 'ABIERTO', numero_orden: '1' };
const detalleBase = { id_pedido_producto: 1, id_pedido: 1, id_producto: 1, cantidad: 2, subtotal: 30 };
const usuarioMock = { id_usuario: 1, id_sucursal: 1, rol: 'mesero' };

describe('OrdenController', () => {
  let controller: OrdenController;
  let mockOrdenService: any;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOrdenService = {
      listarOrdenes: jest.fn(),
      obtenerOrdenPorId: jest.fn(),
      obtenerDetallesOrden: jest.fn(),
      actualizarOrden: jest.fn(),
      cancelarOrden: jest.fn(),
      agregarDetalleOrden: jest.fn(),
      actualizarDetalleOrden: jest.fn(),
      removerDetalleOrden: jest.fn(),
    };
    controller = new OrdenController(mockOrdenService);
    res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
    ordenValidator.validateActualizarOrden.mockReturnValue({ data: { estado_operativo: 'EN_PREPARACION' }, error: null });
    ordenValidator.validateCrearOrdenDetalle.mockReturnValue({ data: { id_producto: 1, cantidad: 2 }, error: null });
    ordenValidator.validateActualizarOrdenDetalle.mockReturnValue({ data: { cantidad: 3 }, error: null });
  });

  describe('listarOrdenes', () => {
    it('debería listar las órdenes del usuario', async () => {
      mockOrdenService.listarOrdenes.mockResolvedValueOnce([ordenBase]);
      const req = { query: {}, usuario: usuarioMock } as any;
      await controller.listarOrdenes(req, res);
      expect(res.json).toHaveBeenCalledWith([ordenBase]);
    });

    it('debería pasar el estado como filtro', async () => {
      mockOrdenService.listarOrdenes.mockResolvedValueOnce([]);
      const req = { query: { estado: 'ABIERTO' }, usuario: usuarioMock } as any;
      await controller.listarOrdenes(req, res);
      expect(mockOrdenService.listarOrdenes).toHaveBeenCalledWith(usuarioMock.id_sucursal, 'ABIERTO');
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockOrdenService.listarOrdenes.mockRejectedValueOnce(new AppError('Error', 500));
      const req = { query: {}, usuario: usuarioMock } as any;
      await controller.listarOrdenes(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('debería responder 500 ante error inesperado', async () => {
      mockOrdenService.listarOrdenes.mockRejectedValueOnce(new Error('boom'));
      const req = { query: {}, usuario: usuarioMock } as any;
      await controller.listarOrdenes(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('obtenerOrden', () => {
    it('debería retornar 400 si el id no es válido', async () => {
      const req = { params: { id: 'abc' } } as any;
      await controller.obtenerOrden(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería retornar 404 si la orden no existe', async () => {
      mockOrdenService.obtenerOrdenPorId.mockResolvedValueOnce(null);
      const req = { params: { id: '999' } } as any;
      await controller.obtenerOrden(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debería retornar la orden con sus detalles', async () => {
      mockOrdenService.obtenerOrdenPorId.mockResolvedValueOnce(ordenBase);
      mockOrdenService.obtenerDetallesOrden.mockResolvedValueOnce([detalleBase]);
      const req = { params: { id: '1' } } as any;
      await controller.obtenerOrden(req, res);
      expect(res.json).toHaveBeenCalledWith({ ...ordenBase, detalles: [detalleBase] });
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockOrdenService.obtenerOrdenPorId.mockRejectedValueOnce(new AppError('Error', 500));
      const req = { params: { id: '1' } } as any;
      await controller.obtenerOrden(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('actualizarOrden', () => {
    it('debería retornar 400 si el id no es válido', async () => {
      const req = { params: { id: 'abc' }, body: {} } as any;
      await controller.actualizarOrden(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería retornar 400 si la validación falla', async () => {
      ordenValidator.validateActualizarOrden.mockReturnValue({ data: null, error: 'Estado inválido' });
      const req = { params: { id: '1' }, body: {} } as any;
      await controller.actualizarOrden(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería actualizar la orden', async () => {
      const ordenActualizada = { ...ordenBase, estado_operativo: 'EN_PREPARACION' };
      mockOrdenService.actualizarOrden.mockResolvedValueOnce(ordenActualizada);
      const req = { params: { id: '1' }, body: { estado_operativo: 'EN_PREPARACION' } } as any;
      await controller.actualizarOrden(req, res);
      expect(res.json).toHaveBeenCalledWith(ordenActualizada);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockOrdenService.actualizarOrden.mockRejectedValueOnce(new AppError('Error', 500));
      const req = { params: { id: '1' }, body: {} } as any;
      await controller.actualizarOrden(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('cancelarOrden', () => {
    it('debería retornar 400 si el id no es válido', async () => {
      const req = { params: { id: 'abc' } } as any;
      await controller.cancelarOrden(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería cancelar la orden y responder 204', async () => {
      mockOrdenService.cancelarOrden.mockResolvedValueOnce(undefined);
      const req = { params: { id: '1' } } as any;
      await controller.cancelarOrden(req, res);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockOrdenService.cancelarOrden.mockRejectedValueOnce(new AppError('Error', 500));
      const req = { params: { id: '1' } } as any;
      await controller.cancelarOrden(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('agregarDetalle', () => {
    it('debería retornar 400 si el id de pedido no es válido', async () => {
      const req = { params: { id: 'abc' }, body: {}, usuario: usuarioMock } as any;
      await controller.agregarDetalle(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería retornar 400 si la validación falla', async () => {
      ordenValidator.validateCrearOrdenDetalle.mockReturnValue({ data: null, error: 'Producto requerido' });
      const req = { params: { id: '1' }, body: {}, usuario: usuarioMock } as any;
      await controller.agregarDetalle(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería agregar el detalle y responder 201', async () => {
      mockOrdenService.agregarDetalleOrden.mockResolvedValueOnce(detalleBase);
      const req = { params: { id: '1' }, body: { id_producto: 1, cantidad: 2 }, usuario: usuarioMock } as any;
      await controller.agregarDetalle(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(detalleBase);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockOrdenService.agregarDetalleOrden.mockRejectedValueOnce(new AppError('Producto no encontrado', 404));
      const req = { params: { id: '1' }, body: { id_producto: 99, cantidad: 1 }, usuario: usuarioMock } as any;
      await controller.agregarDetalle(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('actualizarDetalle', () => {
    it('debería retornar 400 si algún id no es válido', async () => {
      const req = { params: { id: 'abc', detalleId: '1' }, body: {} } as any;
      await controller.actualizarDetalle(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería retornar 400 si la validación falla', async () => {
      ordenValidator.validateActualizarOrdenDetalle.mockReturnValue({ data: null, error: 'Cantidad inválida' });
      const req = { params: { id: '1', detalleId: '1' }, body: {} } as any;
      await controller.actualizarDetalle(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería actualizar el detalle', async () => {
      const detalleActualizado = { ...detalleBase, cantidad: 3 };
      mockOrdenService.actualizarDetalleOrden.mockResolvedValueOnce(detalleActualizado);
      const req = { params: { id: '1', detalleId: '1' }, body: { cantidad: 3 } } as any;
      await controller.actualizarDetalle(req, res);
      expect(res.json).toHaveBeenCalledWith(detalleActualizado);
    });
  });

  describe('removerDetalle', () => {
    it('debería retornar 400 si algún id no es válido', async () => {
      const req = { params: { id: '1', detalleId: 'abc' } } as any;
      await controller.removerDetalle(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería remover el detalle y responder 204', async () => {
      mockOrdenService.removerDetalleOrden.mockResolvedValueOnce(undefined);
      const req = { params: { id: '1', detalleId: '1' } } as any;
      await controller.removerDetalle(req, res);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockOrdenService.removerDetalleOrden.mockRejectedValueOnce(new AppError('Detalle no encontrado', 404));
      const req = { params: { id: '1', detalleId: '99' } } as any;
      await controller.removerDetalle(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
