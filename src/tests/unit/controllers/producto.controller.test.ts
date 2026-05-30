import { ProductoController } from '../../../presentation/producto/producto.controller';
import { AppError } from '../../../helpers/app-error';

jest.mock('../../../domain/validators/producto.validator', () => ({
  validateCrearProducto: jest.fn(),
  validateActualizarProducto: jest.fn(),
  validateCrearCategoria: jest.fn(),
}));

const productoValidator = require('../../../domain/validators/producto.validator');

const productoBase = { id_producto: 1, nombre: 'Hamburguesa', precio: 15, activo: true };
const categoriaBase = { id_categoria: 1, nombre: 'Comida rápida' };
const usuarioMock = { id_usuario: 1, id_sucursal: 1, rol: 'cocinero' };

describe('ProductoController', () => {
  let controller: ProductoController;
  let mockProductoService: any;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProductoService = {
      listarProductos: jest.fn(),
      obtenerProductoPorId: jest.fn(),
      obtenerSucursalesDeProducto: jest.fn(),
      obtenerIngredientesDeProducto: jest.fn(),
      crearProducto: jest.fn(),
      actualizarProducto: jest.fn(),
      eliminarProducto: jest.fn(),
      listarCategorias: jest.fn(),
      crearCategoria: jest.fn(),
    };
    controller = new ProductoController(mockProductoService);
    res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
    productoValidator.validateCrearProducto.mockReturnValue({ data: { nombre: 'Hamburguesa', precio: 15, id_sucursal: 1, ids_sucursales: [1] }, error: null });
    productoValidator.validateActualizarProducto.mockReturnValue({ data: { precio: 20 }, error: null });
    productoValidator.validateCrearCategoria.mockReturnValue({ data: { nombre: 'Comida rápida' }, error: null });
  });

  describe('listarProductos', () => {
    it('debería retornar los productos de la sucursal del usuario', async () => {
      mockProductoService.listarProductos.mockResolvedValueOnce([productoBase]);
      const req = { usuario: usuarioMock } as any;
      await controller.listarProductos(req, res);
      expect(res.json).toHaveBeenCalledWith([productoBase]);
      expect(mockProductoService.listarProductos).toHaveBeenCalledWith(usuarioMock.id_sucursal);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockProductoService.listarProductos.mockRejectedValueOnce(new AppError('Error', 500));
      const req = { usuario: usuarioMock } as any;
      await controller.listarProductos(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('debería responder 500 ante error inesperado', async () => {
      mockProductoService.listarProductos.mockRejectedValueOnce(new Error('boom'));
      const req = { usuario: usuarioMock } as any;
      await controller.listarProductos(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('obtenerProducto', () => {
    it('debería retornar 400 si el id no es válido', async () => {
      const req = { params: { id: 'abc' } } as any;
      await controller.obtenerProducto(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería retornar 404 si el producto no existe', async () => {
      mockProductoService.obtenerProductoPorId.mockResolvedValueOnce(null);
      const req = { params: { id: '999' } } as any;
      await controller.obtenerProducto(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debería retornar el producto si existe', async () => {
      mockProductoService.obtenerProductoPorId.mockResolvedValueOnce(productoBase);
      const req = { params: { id: '1' } } as any;
      await controller.obtenerProducto(req, res);
      expect(res.json).toHaveBeenCalledWith(productoBase);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockProductoService.obtenerProductoPorId.mockRejectedValueOnce(new AppError('Error', 500));
      const req = { params: { id: '1' } } as any;
      await controller.obtenerProducto(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('crearProducto', () => {
    it('debería retornar 400 si la validación falla', async () => {
      productoValidator.validateCrearProducto.mockReturnValue({ data: null, error: 'Nombre requerido' });
      const req = { body: {} } as any;
      await controller.crearProducto(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería crear el producto y responder 201', async () => {
      mockProductoService.crearProducto.mockResolvedValueOnce(productoBase);
      const req = { body: { nombre: 'Hamburguesa', precio: 15 }, usuario: { id_usuario: 1, id_sucursal: 1, rol: 'gerente' } } as any;
      await controller.crearProducto(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(productoBase);
    });

    it('debería responder 403 si un no-admin intenta crear para otra sucursal', async () => {
      productoValidator.validateCrearProducto.mockReturnValue({
        data: { nombre: 'Hamburguesa', precio: 15, id_sucursal: 2, ids_sucursales: [1, 2] },
        error: null,
      });

      const req = {
        body: { nombre: 'Hamburguesa', precio: 15, id_sucursal: 2 },
        usuario: { id_usuario: 10, id_sucursal: 1, rol: 'gerente' },
      } as any;

      await controller.crearProducto(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockProductoService.crearProducto).not.toHaveBeenCalled();
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockProductoService.crearProducto.mockRejectedValueOnce(new AppError('Nombre duplicado', 409));
      const req = { body: {}, usuario: { id_usuario: 1, id_sucursal: 1, rol: 'gerente' } } as any;
      await controller.crearProducto(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('debería responder 500 ante error inesperado', async () => {
      mockProductoService.crearProducto.mockRejectedValueOnce(new Error('boom'));
      const req = { body: {}, usuario: { id_usuario: 1, id_sucursal: 1, rol: 'gerente' } } as any;
      await controller.crearProducto(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('actualizarProducto', () => {
    it('debería retornar 400 si el id no es válido', async () => {
      const req = { params: { id: 'abc' }, body: {} } as any;
      await controller.actualizarProducto(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería retornar 400 si la validación falla', async () => {
      productoValidator.validateActualizarProducto.mockReturnValue({ data: null, error: 'Precio inválido' });
      const req = { params: { id: '1' }, body: {} } as any;
      await controller.actualizarProducto(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería actualizar el producto', async () => {
      const actualizado = { ...productoBase, precio: 20 };
      mockProductoService.actualizarProducto.mockResolvedValueOnce(actualizado);
      const req = { params: { id: '1' }, body: { precio: 20 } } as any;
      await controller.actualizarProducto(req, res);
      expect(res.json).toHaveBeenCalledWith(actualizado);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockProductoService.actualizarProducto.mockRejectedValueOnce(new AppError('No encontrado', 404));
      const req = { params: { id: '1' }, body: {} } as any;
      await controller.actualizarProducto(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debería responder 403 si no-admin intenta actualizar sucursales fuera de su sucursal', async () => {
      productoValidator.validateActualizarProducto.mockReturnValue({
        data: { ids_sucursales: [1, 2] },
        error: null,
      });

      const req = {
        params: { id: '1' },
        body: { ids_sucursales: [1, 2] },
        usuario: { id_usuario: 10, id_sucursal: 1, rol: 'gerente' },
      } as any;

      await controller.actualizarProducto(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockProductoService.actualizarProducto).not.toHaveBeenCalled();
    });
  });

  describe('obtenerSucursalesDeProducto', () => {
    it('debería retornar 400 si el id no es válido', async () => {
      const req = { params: { id: 'abc' } } as any;
      await controller.obtenerSucursalesDeProducto(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería retornar sucursales del producto', async () => {
      mockProductoService.obtenerSucursalesDeProducto.mockResolvedValueOnce([
        { id_sucursal: 1, activo: true },
      ]);

      const req = { params: { id: '1' } } as any;
      await controller.obtenerSucursalesDeProducto(req, res);
      expect(res.json).toHaveBeenCalledWith([{ id_sucursal: 1, activo: true }]);
    });
  });

  describe('obtenerIngredientesDeProducto', () => {
    it('debería retornar 400 si el id no es válido', async () => {
      const req = { params: { id: 'abc' } } as any;
      await controller.obtenerIngredientesDeProducto(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería retornar ingredientes del producto', async () => {
      mockProductoService.obtenerIngredientesDeProducto.mockResolvedValueOnce([
        { id_ingrediente: 1, cantidad: 0.25, nombre_ingrediente: 'Queso', unidad_medida: 'kg', activo: true },
      ]);

      const req = { params: { id: '1' } } as any;
      await controller.obtenerIngredientesDeProducto(req, res);
      expect(res.json).toHaveBeenCalledWith([
        { id_ingrediente: 1, cantidad: 0.25, nombre_ingrediente: 'Queso', unidad_medida: 'kg', activo: true },
      ]);
    });
  });

  describe('eliminarProducto', () => {
    it('debería retornar 400 si el id no es válido', async () => {
      const req = { params: { id: 'abc' } } as any;
      await controller.eliminarProducto(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería eliminar el producto y responder 204', async () => {
      mockProductoService.eliminarProducto.mockResolvedValueOnce(undefined);
      const req = { params: { id: '1' } } as any;
      await controller.eliminarProducto(req, res);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockProductoService.eliminarProducto.mockRejectedValueOnce(new AppError('No encontrado', 404));
      const req = { params: { id: '1' } } as any;
      await controller.eliminarProducto(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

});
