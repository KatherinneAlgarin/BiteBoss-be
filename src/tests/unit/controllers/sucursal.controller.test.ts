import { SucursalController } from '../../../presentation/sucursal/sucursal.controller';
import { AppError } from '../../../helpers/app-error';

jest.mock('../../../domain/validators/sucursal.validator', () => ({
  validateCrearSucursal: jest.fn(),
  validateActualizarSucursal: jest.fn(),
}));

const sucursalValidator = require('../../../domain/validators/sucursal.validator');

const sucursalBase = { id_sucursal: 1, nombre: 'Sucursal Centro', direccion: 'Av. Principal 123', activo: true };

describe('SucursalController', () => {
  let controller: SucursalController;
  let mockSucursalService: any;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSucursalService = {
      listar: jest.fn(),
      obtenerPorId: jest.fn(),
      crear: jest.fn(),
      actualizar: jest.fn(),
      obtenerDependencias: jest.fn(),
      activar: jest.fn(),
      desactivar: jest.fn(),
    };
    controller = new SucursalController(mockSucursalService);
    res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
    sucursalValidator.validateCrearSucursal.mockReturnValue({
      data: { nombre: 'Sucursal Norte', direccion: 'Calle 5', tipos_orden: [1], tipos_pago: [1] },
      error: null,
    });
    sucursalValidator.validateActualizarSucursal.mockReturnValue({
      data: { nombre: 'Nuevo Nombre' },
      error: null,
    });
  });

  describe('listar', () => {
    it('debería listar todas las sucursales', async () => {
      mockSucursalService.listar.mockResolvedValueOnce([sucursalBase]);
      const req = { query: {} } as any;
      await controller.listar(req, res);
      expect(res.json).toHaveBeenCalledWith([sucursalBase]);
      expect(mockSucursalService.listar).toHaveBeenCalledWith(false);
    });

    it('debería listar solo sucursales activas cuando activo=true', async () => {
      mockSucursalService.listar.mockResolvedValueOnce([sucursalBase]);
      const req = { query: { activo: 'true' } } as any;
      await controller.listar(req, res);
      expect(mockSucursalService.listar).toHaveBeenCalledWith(true);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockSucursalService.listar.mockRejectedValueOnce(new AppError('Error', 500));
      const req = { query: {} } as any;
      await controller.listar(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('debería responder 500 ante error inesperado', async () => {
      mockSucursalService.listar.mockRejectedValueOnce(new Error('boom'));
      const req = { query: {} } as any;
      await controller.listar(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('obtener', () => {
    it('debería retornar 400 si el id no es válido', async () => {
      const req = { params: { id: 'abc' } } as any;
      await controller.obtener(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería retornar 404 si la sucursal no existe', async () => {
      mockSucursalService.obtenerPorId.mockResolvedValueOnce(null);
      const req = { params: { id: '999' } } as any;
      await controller.obtener(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debería retornar la sucursal si existe', async () => {
      mockSucursalService.obtenerPorId.mockResolvedValueOnce(sucursalBase);
      const req = { params: { id: '1' } } as any;
      await controller.obtener(req, res);
      expect(res.json).toHaveBeenCalledWith(sucursalBase);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockSucursalService.obtenerPorId.mockRejectedValueOnce(new AppError('Error', 500));
      const req = { params: { id: '1' } } as any;
      await controller.obtener(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('crear', () => {
    it('debería retornar 400 si la validación falla', async () => {
      sucursalValidator.validateCrearSucursal.mockReturnValue({ data: null, error: 'Nombre requerido' });
      const req = { body: {} } as any;
      await controller.crear(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería crear la sucursal y responder 201', async () => {
      mockSucursalService.crear.mockResolvedValueOnce(sucursalBase);
      const req = { body: { nombre: 'Sucursal Norte', direccion: 'Calle 5', tipos_orden: [1], tipos_pago: [1] } } as any;
      await controller.crear(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(sucursalBase);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockSucursalService.crear.mockRejectedValueOnce(new AppError('Nombre duplicado', 409));
      const req = { body: {} } as any;
      await controller.crear(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('debería responder 500 ante error inesperado', async () => {
      mockSucursalService.crear.mockRejectedValueOnce(new Error('boom'));
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
      sucursalValidator.validateActualizarSucursal.mockReturnValue({ data: null, error: 'Nombre inválido' });
      const req = { params: { id: '1' }, body: {} } as any;
      await controller.actualizar(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería actualizar la sucursal', async () => {
      const sucursalActualizada = { ...sucursalBase, nombre: 'Nuevo Nombre' };
      mockSucursalService.actualizar.mockResolvedValueOnce(sucursalActualizada);
      const req = { params: { id: '1' }, body: { nombre: 'Nuevo Nombre' } } as any;
      await controller.actualizar(req, res);
      expect(res.json).toHaveBeenCalledWith(sucursalActualizada);
    });
  });

  describe('obtenerDependencias', () => {
    it('debería retornar 400 si el id no es válido', async () => {
      const req = { params: { id: 'abc' } } as any;
      await controller.obtenerDependencias(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería retornar las dependencias de la sucursal', async () => {
      const dependencias = { zonas: [], usuarios: [] };
      mockSucursalService.obtenerDependencias.mockResolvedValueOnce(dependencias);
      const req = { params: { id: '1' } } as any;
      await controller.obtenerDependencias(req, res);
      expect(res.json).toHaveBeenCalledWith(dependencias);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockSucursalService.obtenerDependencias.mockRejectedValueOnce(new AppError('Error', 500));
      const req = { params: { id: '1' } } as any;
      await controller.obtenerDependencias(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('desactivar', () => {
    it('debería retornar 400 si el id no es válido', async () => {
      const req = { params: { id: 'abc' } } as any;
      await controller.desactivar(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería desactivar la sucursal', async () => {
      const desactivada = { ...sucursalBase, activo: false };
      mockSucursalService.desactivar.mockResolvedValueOnce(desactivada);
      const req = { params: { id: '1' } } as any;
      await controller.desactivar(req, res);
      expect(res.json).toHaveBeenCalledWith(desactivada);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockSucursalService.desactivar.mockRejectedValueOnce(new AppError('Tiene info activa', 409));
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

    it('debería activar la sucursal', async () => {
      mockSucursalService.activar.mockResolvedValueOnce(sucursalBase);
      const req = { params: { id: '1' } } as any;
      await controller.activar(req, res);
      expect(res.json).toHaveBeenCalledWith(sucursalBase);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockSucursalService.activar.mockRejectedValueOnce(new AppError('Error', 500));
      const req = { params: { id: '1' } } as any;
      await controller.activar(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
