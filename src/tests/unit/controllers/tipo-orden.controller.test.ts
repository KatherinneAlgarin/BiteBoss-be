import { TipoOrdenController } from '../../../presentation/tipo-orden/tipo-orden.controller';
import { AppError } from '../../../helpers/app-error';

jest.mock('../../../domain/validators/tipo-orden.validator', () => ({
  validateCrearTipoOrden: jest.fn(),
  validateActualizarTipoOrden: jest.fn(),
}));

const tipoOrdenValidator = require('../../../domain/validators/tipo-orden.validator');

const tipoOrdenBase = { id_tipo_orden: 1, nombre: 'Para llevar', requiere_mesa: false, activo: true, id_tipo_orden_padre: null };

describe('TipoOrdenController', () => {
  let controller: TipoOrdenController;
  let mockTipoOrdenService: any;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTipoOrdenService = {
      listar: jest.fn(),
      obtenerPorId: jest.fn(),
      crear: jest.fn(),
      actualizar: jest.fn(),
      desactivar: jest.fn(),
      activar: jest.fn(),
    };
    controller = new TipoOrdenController(mockTipoOrdenService);
    res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
    tipoOrdenValidator.validateCrearTipoOrden.mockReturnValue({
      data: { nombre: 'Express', requiere_mesa: false },
      error: null,
    });
    tipoOrdenValidator.validateActualizarTipoOrden.mockReturnValue({
      data: { requiere_mesa: true },
      error: null,
    });
  });

  describe('listar', () => {
    it('debería retornar los tipos de orden', async () => {
      mockTipoOrdenService.listar.mockResolvedValueOnce([tipoOrdenBase]);
      await controller.listar({} as any, res);
      expect(res.json).toHaveBeenCalledWith([tipoOrdenBase]);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockTipoOrdenService.listar.mockRejectedValueOnce(new AppError('Error', 500));
      await controller.listar({} as any, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('debería responder 500 ante error inesperado', async () => {
      mockTipoOrdenService.listar.mockRejectedValueOnce(new Error('boom'));
      await controller.listar({} as any, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('obtener', () => {
    it('debería retornar 400 si el id no es válido', async () => {
      const req = { params: { id: 'abc' } } as any;
      await controller.obtener(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería retornar 404 si el tipo no existe', async () => {
      mockTipoOrdenService.obtenerPorId.mockResolvedValueOnce(null);
      const req = { params: { id: '999' } } as any;
      await controller.obtener(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debería retornar el tipo de orden si existe', async () => {
      mockTipoOrdenService.obtenerPorId.mockResolvedValueOnce(tipoOrdenBase);
      const req = { params: { id: '1' } } as any;
      await controller.obtener(req, res);
      expect(res.json).toHaveBeenCalledWith(tipoOrdenBase);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockTipoOrdenService.obtenerPorId.mockRejectedValueOnce(new AppError('Error', 500));
      const req = { params: { id: '1' } } as any;
      await controller.obtener(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('crear', () => {
    it('debería retornar 400 si la validación falla', async () => {
      tipoOrdenValidator.validateCrearTipoOrden.mockReturnValue({ data: null, error: 'Nombre requerido' });
      const req = { body: {} } as any;
      await controller.crear(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería crear el tipo de orden y responder 201', async () => {
      mockTipoOrdenService.crear.mockResolvedValueOnce(tipoOrdenBase);
      const req = { body: { nombre: 'Express', requiere_mesa: false } } as any;
      await controller.crear(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(tipoOrdenBase);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockTipoOrdenService.crear.mockRejectedValueOnce(new AppError('Nombre duplicado', 409));
      const req = { body: {} } as any;
      await controller.crear(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('debería responder 500 ante error inesperado', async () => {
      mockTipoOrdenService.crear.mockRejectedValueOnce(new Error('boom'));
      const req = { body: {} } as any;
      await controller.crear(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('actualizar', () => {
    it('debería retornar 400 si el id no es válido', async () => {
      const req = { params: { id: 'abc' }, body: {} } as any;
      await controller.actualizar(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería retornar 400 si la validación falla', async () => {
      tipoOrdenValidator.validateActualizarTipoOrden.mockReturnValue({ data: null, error: 'requiere_mesa inválido' });
      const req = { params: { id: '1' }, body: {} } as any;
      await controller.actualizar(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería actualizar el tipo de orden', async () => {
      const actualizado = { ...tipoOrdenBase, requiere_mesa: true };
      mockTipoOrdenService.actualizar.mockResolvedValueOnce(actualizado);
      const req = { params: { id: '1' }, body: { requiere_mesa: true } } as any;
      await controller.actualizar(req, res);
      expect(res.json).toHaveBeenCalledWith(actualizado);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockTipoOrdenService.actualizar.mockRejectedValueOnce(new AppError('No encontrado', 404));
      const req = { params: { id: '1' }, body: {} } as any;
      await controller.actualizar(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('desactivar', () => {
    it('debería retornar 400 si el id no es válido', async () => {
      const req = { params: { id: 'abc' } } as any;
      await controller.desactivar(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería desactivar el tipo de orden', async () => {
      const desactivado = { ...tipoOrdenBase, activo: false };
      mockTipoOrdenService.desactivar.mockResolvedValueOnce(desactivado);
      const req = { params: { id: '1' } } as any;
      await controller.desactivar(req, res);
      expect(res.json).toHaveBeenCalledWith(desactivado);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockTipoOrdenService.desactivar.mockRejectedValueOnce(new AppError('Tiene pedidos activos', 409));
      const req = { params: { id: '1' } } as any;
      await controller.desactivar(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('activar', () => {
    it('debería retornar 400 si el id no es válido', async () => {
      const req = { params: { id: 'abc' } } as any;
      await controller.activar(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería activar el tipo de orden', async () => {
      mockTipoOrdenService.activar.mockResolvedValueOnce(tipoOrdenBase);
      const req = { params: { id: '1' } } as any;
      await controller.activar(req, res);
      expect(res.json).toHaveBeenCalledWith(tipoOrdenBase);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockTipoOrdenService.activar.mockRejectedValueOnce(new AppError('Padre inactivo', 400));
      const req = { params: { id: '1' } } as any;
      await controller.activar(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
