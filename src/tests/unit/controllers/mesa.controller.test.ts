import { MesaController } from '../../../presentation/mesa/mesa.controller';
import { AppError } from '../../../helpers/app-error';

jest.mock('../../../domain/validators/mesa.validator', () => ({
  validateCrearMesa: jest.fn(),
  validateActualizarMesa: jest.fn(),
}));

const mesaValidator = require('../../../domain/validators/mesa.validator');

const mesaBase = { id_mesa: 1, id_zona: 1, numero: 5, capacidad: 4, activo: true };

describe('MesaController', () => {
  let controller: MesaController;
  let mockMesaService: any;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMesaService = {
      listarPorZona: jest.fn(),
      obtenerPorId: jest.fn(),
      crear: jest.fn(),
      actualizar: jest.fn(),
      desactivar: jest.fn(),
      activar: jest.fn(),
    };
    controller = new MesaController(mockMesaService);
    res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
    mesaValidator.validateCrearMesa.mockReturnValue({ data: { id_zona: 1, numero: 5, capacidad: 4 }, error: null });
    mesaValidator.validateActualizarMesa.mockReturnValue({ data: { capacidad: 8 }, error: null });
  });

  describe('listar', () => {
    it('debería retornar 400 si id_zona no es válido', async () => {
      const req = { query: { id_zona: 'abc' } } as any;
      await controller.listar(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería retornar 400 si id_zona es 0', async () => {
      const req = { query: { id_zona: '0' } } as any;
      await controller.listar(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería listar las mesas de la zona', async () => {
      mockMesaService.listarPorZona.mockResolvedValueOnce([mesaBase]);
      const req = { query: { id_zona: '1' } } as any;
      await controller.listar(req, res);
      expect(res.json).toHaveBeenCalledWith([mesaBase]);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockMesaService.listarPorZona.mockRejectedValueOnce(new AppError('Error', 500));
      const req = { query: { id_zona: '1' } } as any;
      await controller.listar(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('debería responder 500 ante error inesperado', async () => {
      mockMesaService.listarPorZona.mockRejectedValueOnce(new Error('boom'));
      const req = { query: { id_zona: '1' } } as any;
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

    it('debería retornar 404 si la mesa no existe', async () => {
      mockMesaService.obtenerPorId.mockResolvedValueOnce(null);
      const req = { params: { id: '999' } } as any;
      await controller.obtener(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debería retornar la mesa si existe', async () => {
      mockMesaService.obtenerPorId.mockResolvedValueOnce(mesaBase);
      const req = { params: { id: '1' } } as any;
      await controller.obtener(req, res);
      expect(res.json).toHaveBeenCalledWith(mesaBase);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockMesaService.obtenerPorId.mockRejectedValueOnce(new AppError('Error', 500));
      const req = { params: { id: '1' } } as any;
      await controller.obtener(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('crear', () => {
    it('debería retornar 400 si la validación falla', async () => {
      mesaValidator.validateCrearMesa.mockReturnValue({ data: null, error: 'Número requerido' });
      const req = { body: {} } as any;
      await controller.crear(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería crear la mesa y responder 201', async () => {
      mockMesaService.crear.mockResolvedValueOnce(mesaBase);
      const req = { body: { id_zona: 1, numero: 5, capacidad: 4 } } as any;
      await controller.crear(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mesaBase);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockMesaService.crear.mockRejectedValueOnce(new AppError('Zona no existe', 400));
      const req = { body: { id_zona: 99, numero: 5, capacidad: 4 } } as any;
      await controller.crear(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería responder 500 ante error inesperado', async () => {
      mockMesaService.crear.mockRejectedValueOnce(new Error('boom'));
      const req = { body: { id_zona: 1, numero: 5, capacidad: 4 } } as any;
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
      mesaValidator.validateActualizarMesa.mockReturnValue({ data: null, error: 'Capacidad inválida' });
      const req = { params: { id: '1' }, body: {} } as any;
      await controller.actualizar(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería actualizar la mesa', async () => {
      const mesaActualizada = { ...mesaBase, capacidad: 8 };
      mockMesaService.actualizar.mockResolvedValueOnce(mesaActualizada);
      const req = { params: { id: '1' }, body: { capacidad: 8 } } as any;
      await controller.actualizar(req, res);
      expect(res.json).toHaveBeenCalledWith(mesaActualizada);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockMesaService.actualizar.mockRejectedValueOnce(new AppError('No encontrada', 404));
      const req = { params: { id: '1' }, body: { capacidad: 8 } } as any;
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

    it('debería desactivar la mesa', async () => {
      const mesaDesactivada = { ...mesaBase, activo: false };
      mockMesaService.desactivar.mockResolvedValueOnce(mesaDesactivada);
      const req = { params: { id: '1' } } as any;
      await controller.desactivar(req, res);
      expect(res.json).toHaveBeenCalledWith(mesaDesactivada);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockMesaService.desactivar.mockRejectedValueOnce(new AppError('Error', 500));
      const req = { params: { id: '1' } } as any;
      await controller.desactivar(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('activar', () => {
    it('debería retornar 400 si el id no es válido', async () => {
      const req = { params: { id: 'abc' } } as any;
      await controller.activar(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería activar la mesa', async () => {
      mockMesaService.activar.mockResolvedValueOnce(mesaBase);
      const req = { params: { id: '1' } } as any;
      await controller.activar(req, res);
      expect(res.json).toHaveBeenCalledWith(mesaBase);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockMesaService.activar.mockRejectedValueOnce(new AppError('Error', 500));
      const req = { params: { id: '1' } } as any;
      await controller.activar(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
