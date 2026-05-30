import { ProductoService } from '../../../services/producto.service';
import { createSupabaseMock } from '../../mocks/supabase.mock';
import { AppError } from '../../../helpers/app-error';

jest.mock('../../../config/supabase');

describe('ProductoService', () => {
  let productoService: ProductoService;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createSupabaseMock();
    
    const supabaseModule = require('../../../config/supabase');
    supabaseModule.default = mockSupabase;
    
    productoService = new ProductoService();
  });

  describe('listarProductos', () => {
    
    const productosResponse = [
      {
        id_producto: 1,
        nombre: 'Pizza Margarita',
        descripcion: 'Pizza clásica',
        precio: 25.99,
        activo: true,
        id_categoria: 1,
        categoria: { nombre: 'Pizzas' },
      },
      {
        id_producto: 2,
        nombre: 'Hamburguesa',
        descripcion: 'Hamburguesa con queso',
        precio: 15.50,
        activo: true,
        id_categoria: 2,
        categoria: { nombre: 'Hamburguesas' },
      },
    ];

    // ✅ CASOS CORRECTOS
    it('debería listar todos los productos sin filtro', async () => {
      mockSupabase.from().select().eq.mockResolvedValue({
        data: productosResponse,
        error: null,
      });

      const resultado = await productoService.listarProductos();

      expect(resultado).toHaveLength(2);
      expect(resultado[0].nombre).toBe('Pizza Margarita');
      expect(resultado[0].categoria_nombre).toBe('Pizzas');
    });

    it('debería listar productos de una sucursal específica', async () => {
      // Primera query: sucursal_producto con .eq().eq() — usa mockResult
      mockSupabase.from().mockResult({ data: [{ id_producto: 1 }, { id_producto: 2 }], error: null });
      // Segunda query: producto con .eq().in() — usa mockResult
      mockSupabase.from().mockResult({ data: productosResponse, error: null });

      const resultado = await productoService.listarProductos(1);

      expect(resultado).toHaveLength(2);
    });

    it('debería retornar array vacío si sucursal no tiene productos', async () => {
      // Primera query retorna vacío: el servicio hace return [] sin ejecutar segunda query
      mockSupabase.from().mockResult({ data: [], error: null });

      const resultado = await productoService.listarProductos(1);

      expect(resultado).toEqual([]);
    });

    it('debería retornar array vacío si no hay productos', async () => {
      mockSupabase.from().select().eq.mockResolvedValue({
        data: null,
        error: null,
      });

      const resultado = await productoService.listarProductos();

      expect(resultado).toEqual([]);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar error si falla al obtener productos de sucursal', async () => {
      mockSupabase.from().mockResult({ data: null, error: { message: 'Error de BD' } });

      await expect(productoService.listarProductos(1)).rejects.toThrow(
        new AppError('Error al listar productos', 500)
      );
    });

    it('debería lanzar error si falla al listar productos', async () => {
      mockSupabase.from().select().eq.mockResolvedValue({
        data: null,
        error: { message: 'Error de BD' },
      });

      await expect(productoService.listarProductos()).rejects.toThrow(
        new AppError('Error al listar productos', 500)
      );
    });
  });

  describe('obtenerProductoPorId', () => {
    
    const productoResponse = {
      id_producto: 1,
      nombre: 'Pizza Margarita',
      descripcion: 'Pizza clásica',
      precio: 25.99,
      activo: true,
      id_categoria: 1,
    };

    // ✅ CASOS CORRECTOS
    it('debería obtener un producto por ID', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: productoResponse,
        error: null,
      });

      const resultado = await productoService.obtenerProductoPorId(1);

      expect(resultado).toBeDefined();
      expect(resultado?.nombre).toBe('Pizza Margarita');
      expect(resultado?.precio).toBe(25.99);
    });

    // ❌ CASOS DE ERROR
    it('debería retornar null si producto no existe', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const resultado = await productoService.obtenerProductoPorId(999);

      expect(resultado).toBeNull();
    });

    it('debería lanzar error si hay problema en BD', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Error de BD', code: 'OTHER_ERROR' },
      });

      await expect(productoService.obtenerProductoPorId(1)).rejects.toThrow(
        new AppError('Error al obtener producto', 500)
      );
    });
  });

  describe('crearProducto', () => {
    
    const crearProductoDto = {
      nombre: 'Pizza Hawaiana',
      descripcion: 'Pizza con piña',
      precio: 28.99,
      id_categoria: 1,
      id_sucursal: 1,
      activo: true,
      imagen: 'pizza-hawaiana.jpg',
    };

    // ✅ CASOS CORRECTOS
    it('debería crear un producto exitosamente', async () => {
      // Primera query: from('producto').insert().select().single()
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id_producto: 1, ...crearProductoDto },
        error: null,
      });

      // Segunda query: from('sucursal_producto').insert() — awaited directamente (sin .select ni .single)
      mockSupabase.from().mockResult({ data: null, error: null });

      const resultado = await productoService.crearProducto(crearProductoDto);

      expect(resultado.nombre).toBe('Pizza Hawaiana');
      expect(resultado.precio).toBe(28.99);
    });

    it('debería crear un producto y asociarlo a múltiples sucursales', async () => {
      const dtoMulti = {
        ...crearProductoDto,
        ids_sucursales: [1, 2],
      };

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id_producto: 1, ...dtoMulti },
        error: null,
      });

      // Dos inserciones en sucursal_producto
      mockSupabase.from().mockResult({ data: null, error: null });
      mockSupabase.from().mockResult({ data: null, error: null });

      const resultado = await productoService.crearProducto(dtoMulti as any);

      expect(resultado.nombre).toBe('Pizza Hawaiana');
      expect(resultado.precio).toBe(28.99);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar error si falla al crear producto', async () => {
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error inserting' },
      });

      await expect(productoService.crearProducto(crearProductoDto)).rejects.toThrow(
        new AppError('Error al crear producto', 500)
      );
    });

    it('debería lanzar error si falla al asociar con sucursal', async () => {
      // Primera query: from('producto').insert().select().single() — exitosa
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id_producto: 1, ...crearProductoDto },
        error: null,
      });

      // Segunda query: from('sucursal_producto').insert() — falla
      mockSupabase.from().mockResult({ data: null, error: { message: 'Error' } });

      await expect(productoService.crearProducto(crearProductoDto)).rejects.toThrow(
        new AppError('Error al asociar producto con sucursal', 500)
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('producto');
      expect(mockSupabase.from().delete).toHaveBeenCalled();
    });
  });

  describe('actualizarProducto', () => {
    
    const actualizarDto = {
      nombre: 'Pizza Margarita Premium',
      precio: 30.99,
    };

    // ✅ CASOS CORRECTOS
    it('debería actualizar un producto', async () => {
      const productoActualizado = {
        id_producto: 1,
        nombre: 'Pizza Margarita Premium',
        precio: 30.99,
        activo: true,
      };

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: productoActualizado,
        error: null,
      });

      const resultado = await productoService.actualizarProducto(1, actualizarDto);

      expect(resultado.nombre).toBe('Pizza Margarita Premium');
      expect(resultado.precio).toBe(30.99);
    });

    it('debería actualizar un producto y sincronizar sucursales', async () => {
      const productoActualizado = {
        id_producto: 1,
        nombre: 'Pizza Margarita Premium',
        precio: 30.99,
        activo: true,
      };

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: productoActualizado,
        error: null,
      });

      // delete vínculos actuales
      mockSupabase.from().mockResult({ data: null, error: null });
      // insert vínculo 1
      mockSupabase.from().mockResult({ data: null, error: null });
      // insert vínculo 2
      mockSupabase.from().mockResult({ data: null, error: null });

      const resultado = await productoService.actualizarProducto(1, {
        ...actualizarDto,
        ids_sucursales: [1, 2],
      } as any);

      expect(resultado.nombre).toBe('Pizza Margarita Premium');
      expect(mockSupabase.from().delete).toHaveBeenCalled();
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar error si falla actualización', async () => {
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Error updating' },
      });

      await expect(productoService.actualizarProducto(1, actualizarDto)).rejects.toThrow(
        new AppError('Error al actualizar producto', 500)
      );
    });
  });

  describe('eliminarProducto', () => {
    
    // ✅ CASOS CORRECTOS
    it('debería eliminar un producto (marcar como inactivo)', async () => {
      mockSupabase.from().update().eq.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(productoService.eliminarProducto(1)).resolves.toBeUndefined();
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar error si falla al eliminar', async () => {
      mockSupabase.from().update().eq.mockResolvedValue({
        data: null,
        error: { message: 'Error deleting' },
      });

      await expect(productoService.eliminarProducto(1)).rejects.toThrow(
        new AppError('Error al eliminar producto', 500)
      );
    });
  });

  describe('obtenerSucursalesDeProducto', () => {
    it('debería listar sucursales activas asociadas a un producto', async () => {
      mockSupabase.from().select().eq().eq.mockResolvedValue({
        data: [
          { id_sucursal: 1, activo: true },
          { id_sucursal: 2, activo: true },
        ],
        error: null,
      });

      const resultado = await productoService.obtenerSucursalesDeProducto(1);

      expect(resultado).toEqual([
        { id_sucursal: 1, activo: true },
        { id_sucursal: 2, activo: true },
      ]);
    });

    it('debería lanzar error cuando falla la consulta', async () => {
      mockSupabase.from().select().eq().eq.mockResolvedValue({
        data: null,
        error: { message: 'Error DB' },
      });

      await expect(productoService.obtenerSucursalesDeProducto(1)).rejects.toThrow(
        new AppError('Error al obtener sucursales del producto', 500)
      );
    });
  });

  describe('obtenerIngredientesDeProducto', () => {
    it('debería listar ingredientes activos del producto', async () => {
      mockSupabase.from().mockResult({
        data: [
          {
            id_ingrediente: 1,
            cantidad: 0.25,
            activo: true,
            ingrediente: { id_ingrediente: 1, nombre: 'Queso', unidad_medida: 'kg', activo: true },
          },
        ],
        error: null,
      });

      const resultado = await productoService.obtenerIngredientesDeProducto(1);

      expect(resultado).toEqual([
        {
          id_ingrediente: 1,
          cantidad: 0.25,
          activo: true,
          nombre_ingrediente: 'Queso',
          unidad_medida: 'kg',
        },
      ]);
    });

    it('debería lanzar error cuando falla la consulta', async () => {
      mockSupabase.from().mockResult({ data: null, error: { message: 'Error DB' } });

      await expect(productoService.obtenerIngredientesDeProducto(1)).rejects.toThrow(
        new AppError('Error al obtener ingredientes del producto', 500)
      );
    });
  });

  describe('actualizarProducto con ingredientes', () => {
    it('debería sincronizar ingredientes cuando se envían en actualización', async () => {
      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: { id_producto: 1, nombre: 'Pizza', precio: 20, activo: true },
        error: null,
      });

      mockSupabase.from().mockResult({ data: [{ id_ingrediente: 1 }], error: null });
      mockSupabase.from().mockResult({ data: null, error: null });
      mockSupabase.from().mockResult({ data: null, error: null });

      await expect(
        productoService.actualizarProducto(1, {
          ingredientes: [{ id_ingrediente: 1, cantidad: 0.3 }],
        } as any)
      ).resolves.toBeDefined();
    });
  });
});