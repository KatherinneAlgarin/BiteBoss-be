import { ZonaController } from '../../../presentation/zona/zona.controller';
import { AppError } from '../../../helpers/app-error';

jest.mock('../../../domain/validators/zona.validator', () => ({
  validateCrearZona: jest.fn(),
  validateActualizarZona: jest.fn(),
}));

const zonaValidator = require('../../../domain/validators/zona.validator');

const zonaBase = { id_zona: 1, id_sucursal: 1, nombre: 'Terraza', descripcion: null, activo: true };

describe('ZonaController', () => {
  let controller: ZonaController;
  let mockZonaService: any;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockZonaService = {
      listarPorSucursal: jest.fn(),
      obtenerPorId: jest.fn(),
      crear: jest.fn(),
      actualizar: jest.fn(),
      desactivar: jest.fn(),
      activar: jest.fn(),
    };
    controller = new ZonaController(mockZonaService);
    res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
    zonaValidator.validateCrearZona.mockReturnValue({ data: { id_sucursal: 1, nombre: 'Terraza' }, error: null });
    zonaValidator.validateActualizarZona.mockReturnValue({ data: { nombre: 'Nuevo' }, error: null });
  });

  describe('listar', () => {
    it('debería retornar 400 si id_sucursal no es válido', async () => {
      const req = { query: { id_sucursal: 'abc' } } as any;
      await controller.listar(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería retornar 400 si id_sucursal es 0 o negativo', async () => {
      const req = { query: { id_sucursal: '0' } } as any;
      await controller.listar(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería listar las zonas de la sucursal', async () => {
      mockZonaService.listarPorSucursal.mockResolvedValueOnce([zonaBase]);
      const req = { query: { id_sucursal: '1' } } as any;
      await controller.listar(req, res);
      expect(res.json).toHaveBeenCalledWith([zonaBase]);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockZonaService.listarPorSucursal.mockRejectedValueOnce(new AppError('Error', 500));
      const req = { query: { id_sucursal: '1' } } as any;
      await controller.listar(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('debería responder 500 ante error inesperado', async () => {
      mockZonaService.listarPorSucursal.mockRejectedValueOnce(new Error('boom'));
      const req = { query: { id_sucursal: '1' } } as any;
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

    it('debería retornar 404 si la zona no existe', async () => {
      mockZonaService.obtenerPorId.mockResolvedValueOnce(null);
      const req = { params: { id: '999' } } as any;
      await controller.obtener(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debería retornar la zona si existe', async () => {
      mockZonaService.obtenerPorId.mockResolvedValueOnce(zonaBase);
      const req = { params: { id: '1' } } as any;
      await controller.obtener(req, res);
      expect(res.json).toHaveBeenCalledWith(zonaBase);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockZonaService.obtenerPorId.mockRejectedValueOnce(new AppError('Error', 500));
      const req = { params: { id: '1' } } as any;
      await controller.obtener(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('crear', () => {
    it('debería retornar 400 si la validación falla', async () => {
      zonaValidator.validateCrearZona.mockReturnValue({ data: null, error: 'Nombre requerido' });
      const req = { body: {} } as any;
      await controller.crear(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería crear la zona y responder 201', async () => {
      mockZonaService.crear.mockResolvedValueOnce(zonaBase);
      const req = { body: { id_sucursal: 1, nombre: 'Terraza' } } as any;
      await controller.crear(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(zonaBase);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockZonaService.crear.mockRejectedValueOnce(new AppError('Duplicado', 409));
      const req = { body: { id_sucursal: 1, nombre: 'Terraza' } } as any;
      await controller.crear(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('debería responder 500 ante error inesperado', async () => {
      mockZonaService.crear.mockRejectedValueOnce(new Error('boom'));
      const req = { body: { id_sucursal: 1, nombre: 'Terraza' } } as any;
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
      zonaValidator.validateActualizarZona.mockReturnValue({ data: null, error: 'Nombre inválido' });
      const req = { params: { id: '1' }, body: {} } as any;
      await controller.actualizar(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería actualizar la zona', async () => {
      const zonaActualizada = { ...zonaBase, nombre: 'Nuevo' };
      mockZonaService.actualizar.mockResolvedValueOnce(zonaActualizada);
      const req = { params: { id: '1' }, body: { nombre: 'Nuevo' } } as any;
      await controller.actualizar(req, res);
      expect(res.json).toHaveBeenCalledWith(zonaActualizada);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockZonaService.actualizar.mockRejectedValueOnce(new AppError('No encontrada', 404));
      const req = { params: { id: '1' }, body: { nombre: 'Nuevo' } } as any;
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

    it('debería desactivar la zona', async () => {
      const zonaDesactivada = { ...zonaBase, activo: false };
      mockZonaService.desactivar.mockResolvedValueOnce(zonaDesactivada);
      const req = { params: { id: '1' } } as any;
      await controller.desactivar(req, res);
      expect(res.json).toHaveBeenCalledWith(zonaDesactivada);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockZonaService.desactivar.mockRejectedValueOnce(new AppError('Tiene mesas activas', 409));
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

    it('debería activar la zona', async () => {
      mockZonaService.activar.mockResolvedValueOnce(zonaBase);
      const req = { params: { id: '1' } } as any;
      await controller.activar(req, res);
      expect(res.json).toHaveBeenCalledWith(zonaBase);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockZonaService.activar.mockRejectedValueOnce(new AppError('Error', 500));
      const req = { params: { id: '1' } } as any;
      await controller.activar(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
