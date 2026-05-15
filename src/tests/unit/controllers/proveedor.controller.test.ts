import { ProveedorController } from '../../../presentation/proveedor/proveedor.controller';
import { AppError } from '../../../helpers/app-error';

jest.mock('../../../domain/validators/proveedor.validator', () => ({
  validateCrearProveedor: jest.fn(),
  validateActualizarProveedor: jest.fn(),
}));

const proveedorValidator = require('../../../domain/validators/proveedor.validator');

const proveedorBase = { id_proveedor: 1, nombre: 'Proveedor A', email: 'a@test.com', telefono: null, activo: true };

describe('ProveedorController', () => {
  let controller: ProveedorController;
  let mockProveedorService: any;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProveedorService = {
      listarProveedores: jest.fn(),
      obtenerProveedorPorId: jest.fn(),
      crearProveedor: jest.fn(),
      actualizarProveedor: jest.fn(),
      eliminarProveedor: jest.fn(),
    };
    controller = new ProveedorController(mockProveedorService);
    res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
    proveedorValidator.validateCrearProveedor.mockReturnValue({
      data: { nombre: 'Proveedor A', email: 'a@test.com' },
      error: null,
    });
    proveedorValidator.validateActualizarProveedor.mockReturnValue({
      data: { nombre: 'Nuevo Nombre' },
      error: null,
    });
  });

  describe('listarProveedores', () => {
    it('debería retornar la lista de proveedores', async () => {
      mockProveedorService.listarProveedores.mockResolvedValueOnce([proveedorBase]);
      await controller.listarProveedores({} as any, res);
      expect(res.json).toHaveBeenCalledWith([proveedorBase]);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockProveedorService.listarProveedores.mockRejectedValueOnce(new AppError('Error', 500));
      await controller.listarProveedores({} as any, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('debería responder 500 ante error inesperado', async () => {
      mockProveedorService.listarProveedores.mockRejectedValueOnce(new Error('boom'));
      await controller.listarProveedores({} as any, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('obtenerProveedor', () => {
    it('debería retornar 400 si el id no es válido', async () => {
      const req = { params: { id: 'abc' } } as any;
      await controller.obtenerProveedor(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería retornar 404 si el proveedor no existe', async () => {
      mockProveedorService.obtenerProveedorPorId.mockResolvedValueOnce(null);
      const req = { params: { id: '999' } } as any;
      await controller.obtenerProveedor(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debería retornar el proveedor si existe', async () => {
      mockProveedorService.obtenerProveedorPorId.mockResolvedValueOnce(proveedorBase);
      const req = { params: { id: '1' } } as any;
      await controller.obtenerProveedor(req, res);
      expect(res.json).toHaveBeenCalledWith(proveedorBase);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockProveedorService.obtenerProveedorPorId.mockRejectedValueOnce(new AppError('Error', 500));
      const req = { params: { id: '1' } } as any;
      await controller.obtenerProveedor(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('crearProveedor', () => {
    it('debería retornar 400 si la validación falla', async () => {
      proveedorValidator.validateCrearProveedor.mockReturnValue({ data: null, error: 'Debe tener email o teléfono' });
      const req = { body: { nombre: 'Sin contacto' } } as any;
      await controller.crearProveedor(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería crear el proveedor y responder 201', async () => {
      mockProveedorService.crearProveedor.mockResolvedValueOnce(proveedorBase);
      const req = { body: { nombre: 'Proveedor A', email: 'a@test.com' } } as any;
      await controller.crearProveedor(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(proveedorBase);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockProveedorService.crearProveedor.mockRejectedValueOnce(new AppError('Error', 500));
      const req = { body: {} } as any;
      await controller.crearProveedor(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('actualizarProveedor', () => {
    it('debería retornar 400 si el id no es válido', async () => {
      const req = { params: { id: 'abc' }, body: {} } as any;
      await controller.actualizarProveedor(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería retornar 400 si la validación falla', async () => {
      proveedorValidator.validateActualizarProveedor.mockReturnValue({ data: null, error: 'Email inválido' });
      const req = { params: { id: '1' }, body: {} } as any;
      await controller.actualizarProveedor(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería actualizar el proveedor', async () => {
      const actualizado = { ...proveedorBase, nombre: 'Nuevo Nombre' };
      mockProveedorService.actualizarProveedor.mockResolvedValueOnce(actualizado);
      const req = { params: { id: '1' }, body: { nombre: 'Nuevo Nombre' } } as any;
      await controller.actualizarProveedor(req, res);
      expect(res.json).toHaveBeenCalledWith(actualizado);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockProveedorService.actualizarProveedor.mockRejectedValueOnce(new AppError('No encontrado', 404));
      const req = { params: { id: '1' }, body: {} } as any;
      await controller.actualizarProveedor(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('eliminarProveedor', () => {
    it('debería retornar 400 si el id no es válido', async () => {
      const req = { params: { id: 'abc' } } as any;
      await controller.eliminarProveedor(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería eliminar el proveedor y retornar mensaje', async () => {
      mockProveedorService.eliminarProveedor.mockResolvedValueOnce(undefined);
      const req = { params: { id: '1' } } as any;
      await controller.eliminarProveedor(req, res);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Proveedor eliminado correctamente' });
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockProveedorService.eliminarProveedor.mockRejectedValueOnce(new AppError('No encontrado', 404));
      const req = { params: { id: '1' } } as any;
      await controller.eliminarProveedor(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debería responder 500 ante error inesperado', async () => {
      mockProveedorService.eliminarProveedor.mockRejectedValueOnce(new Error('boom'));
      const req = { params: { id: '1' } } as any;
      await controller.eliminarProveedor(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
