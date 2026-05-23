import { validateCrearProducto, validateActualizarProducto, validateCrearCategoria } from '../../../domain/validators/producto.validator';

describe('producto.validator', () => {
  describe('validateCrearProducto', () => {
    
    // ✅ CASOS CORRECTOS
    it('debería validar un producto correcto con todos los campos', () => {
      const result = validateCrearProducto({
        nombre: 'Pizza Margarita',
        descripcion: 'Pizza clásica con tomate y queso',
        precio: 25.99,
        id_categoria: 1,
        id_sucursal: 1,
        activo: true,
        imagen: 'pizza-margarita.jpg',
      });

      expect(result.data).toBeDefined();
      expect(result.data?.nombre).toBe('Pizza Margarita');
      expect(result.data?.precio).toBe(25.99);
      expect(result.error).toBeUndefined();
    });

    it('debería usar activo=true por defecto', () => {
      const result = validateCrearProducto({
        nombre: 'Hamburguesa',
        precio: 15.50,
        id_categoria: 2,
        id_sucursal: 1,
      });

      expect(result.data?.activo).toBe(true);
    });

    it('debería aceptar precio cero', () => {
      const result = validateCrearProducto({
        nombre: 'Producto Gratis',
        precio: 0,
        id_categoria: 1,
        id_sucursal: 1,
        activo: true,
      });

      expect(result.data?.precio).toBe(0);
      expect(result.error).toBeUndefined();
    });

    // ❌ CASOS DE ERROR - NOMBRE
    it('debería rechazar nombre vacío', () => {
      const result = validateCrearProducto({
        nombre: '',
        precio: 25.99,
        id_categoria: 1,
        id_sucursal: 1,
        activo: true,
      });

      expect(result.error).toContain('El nombre del producto es requerido');
    });

    it('debería rechazar si nombre no es string', () => {
      const result = validateCrearProducto({
        nombre: 123,
        precio: 25.99,
        id_categoria: 1,
        id_sucursal: 1,
        activo: true,
      });

      expect(result.error).toContain('El nombre del producto es requerido');
    });

    // ❌ CASOS DE ERROR - PRECIO
    it('debería rechazar precio negativo', () => {
      const result = validateCrearProducto({
        nombre: 'Producto',
        precio: -10,
        id_categoria: 1,
        id_sucursal: 1,
        activo: true,
      });

      expect(result.error).toContain('El precio es requerido y debe ser un número positivo');
    });

    it('debería rechazar si precio no es número', () => {
      const result = validateCrearProducto({
        nombre: 'Producto',
        precio: 'veinticinco',
        id_categoria: 1,
        id_sucursal: 1,
        activo: true,
      });

      expect(result.error).toContain('El precio es requerido');
    });

    it('debería rechazar si precio está undefined', () => {
      const result = validateCrearProducto({
        nombre: 'Producto',
        id_categoria: 1,
        id_sucursal: 1,
        activo: true,
      });

      expect(result.error).toContain('El precio es requerido');
    });

    // ❌ CASOS DE ERROR - CATEGORÍA
    it('debería rechazar si id_categoria no es número', () => {
      const result = validateCrearProducto({
        nombre: 'Producto',
        precio: 25.99,
        id_categoria: 'uno',
        id_sucursal: 1,
        activo: true,
      });

      expect(result.error).toContain('El ID de categoría es requerido');
    });

    // ❌ CASOS DE ERROR - SUCURSAL
    it('debería rechazar si id_sucursal no es número', () => {
      const result = validateCrearProducto({
        nombre: 'Producto',
        precio: 25.99,
        id_categoria: 1,
        id_sucursal: 'sucursal-1',
        activo: true,
      });

      expect(result.error).toContain('Debe enviar al menos una sucursal válida');
    });

    it('debería aceptar ingredientes válidos en creación', () => {
      const result = validateCrearProducto({
        nombre: 'Pizza Especial',
        precio: 32,
        id_categoria: 1,
        id_sucursal: 1,
        ingredientes: [
          { id_ingrediente: 1, cantidad: 0.2 },
          { id_ingrediente: 2, cantidad: 0.1 },
        ],
      });

      expect(result.error).toBeUndefined();
      expect(result.data?.ingredientes).toHaveLength(2);
    });

    it('debería rechazar ingredientes duplicados en creación', () => {
      const result = validateCrearProducto({
        nombre: 'Pizza Especial',
        precio: 32,
        id_categoria: 1,
        id_sucursal: 1,
        ingredientes: [
          { id_ingrediente: 1, cantidad: 0.2 },
          { id_ingrediente: 1, cantidad: 0.1 },
        ],
      });

      expect(result.error).toContain('No se puede repetir el mismo ingrediente');
    });

    // ❌ CASOS DE ERROR - ACTIVO
    it('debería rechazar si activo no es booleano', () => {
      const result = validateCrearProducto({
        nombre: 'Producto',
        precio: 25.99,
        id_categoria: 1,
        id_sucursal: 1,
        activo: 'true',
      });

      expect(result.error).toContain('El campo activo debe ser un booleano');
    });

    // ❌ CASOS DE ERROR - IMAGEN
    it('debería rechazar si imagen no es string', () => {
      const result = validateCrearProducto({
        nombre: 'Producto',
        precio: 25.99,
        id_categoria: 1,
        id_sucursal: 1,
        activo: true,
        imagen: 123,
      });

      expect(result.error).toContain('La imagen debe ser una cadena');
    });
  });

  describe('validateActualizarProducto', () => {
    
    // ✅ CASOS CORRECTOS
    it('debería actualizar solo nombre', () => {
      const result = validateActualizarProducto({
        nombre: 'Nuevo Nombre',
      });

      expect(result.data?.nombre).toBe('Nuevo Nombre');
      expect(result.error).toBeUndefined();
    });

    it('debería actualizar solo precio', () => {
      const result = validateActualizarProducto({
        precio: 35.00,
      });

      expect(result.data?.precio).toBe(35.00);
      expect(result.error).toBeUndefined();
    });

    it('debería actualizar múltiples campos', () => {
      const result = validateActualizarProducto({
        nombre: 'Pizza Especial',
        precio: 29.99,
        activo: false,
      });

      expect(result.data?.nombre).toBe('Pizza Especial');
      expect(result.data?.precio).toBe(29.99);
      expect(result.data?.activo).toBe(false);
      expect(result.error).toBeUndefined();
    });

    // ❌ CASOS DE ERROR
    it('debería rechazar nombre vacío en actualización', () => {
      const result = validateActualizarProducto({
        nombre: '',
      });

      expect(result.error).toContain('El nombre debe ser una cadena no vacía');
    });

    it('debería rechazar precio negativo en actualización', () => {
      const result = validateActualizarProducto({
        precio: -5,
      });

      expect(result.error).toContain('El precio debe ser un número positivo');
    });

    it('debería rechazar si activo no es booleano en actualización', () => {
      const result = validateActualizarProducto({
        activo: 'false',
      });

      expect(result.error).toContain('El campo activo debe ser un booleano');
    });

    it('debería permitir limpiar ingredientes en actualización con arreglo vacío', () => {
      const result = validateActualizarProducto({
        ingredientes: [],
      });

      expect(result.error).toBeUndefined();
      expect(result.data?.ingredientes).toEqual([]);
    });

    it('debería rechazar ingrediente con cantidad inválida en actualización', () => {
      const result = validateActualizarProducto({
        ingredientes: [{ id_ingrediente: 1, cantidad: 0 }],
      });

      expect(result.error).toContain('La cantidad de cada ingrediente debe ser un número mayor a 0');
    });
  });

  describe('validateCrearCategoria', () => {
    
    // ✅ CASOS CORRECTOS
    it('debería validar una categoría correcta', () => {
      const result = validateCrearCategoria({
        nombre: 'Pizzas',
        descripcion: 'Pizzas variadas',
        id_sucursal: 1,
        activo: true,
      });

      expect(result.data).toBeDefined();
      expect(result.data?.nombre).toBe('Pizzas');
      expect(result.error).toBeUndefined();
    });

    it('debería usar activo=true por defecto en categoría', () => {
      const result = validateCrearCategoria({
        nombre: 'Bebidas',
        id_sucursal: 1,
      });

      expect(result.data?.activo).toBe(true);
    });

    // ❌ CASOS DE ERROR - NOMBRE
    it('debería rechazar nombre vacío en categoría', () => {
      const result = validateCrearCategoria({
        nombre: '',
        id_sucursal: 1,
        activo: true,
      });

      expect(result.error).toContain('El nombre de la categoría es requerido');
    });

    it('debería rechazar si nombre de categoría no es string', () => {
      const result = validateCrearCategoria({
        nombre: 456,
        id_sucursal: 1,
        activo: true,
      });

      expect(result.error).toContain('El nombre de la categoría es requerido');
    });

    // ❌ CASOS DE ERROR - SUCURSAL
    it('debería rechazar si id_sucursal de categoría no es número', () => {
      const result = validateCrearCategoria({
        nombre: 'Postres',
        id_sucursal: 'sucursal-1',
        activo: true,
      });

      expect(result.error).toContain('El ID de sucursal es requerido');
    });

    // ❌ CASOS DE ERROR - ACTIVO
    it('debería rechazar si activo en categoría no es booleano', () => {
      const result = validateCrearCategoria({
        nombre: 'Ensaladas',
        id_sucursal: 1,
        activo: 1,
      });

      expect(result.error).toContain('El campo activo debe ser un booleano');
    });
  });
});