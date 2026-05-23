import { InventarioController } from '../../../presentation/inventario/inventario.controller';
import { AppError } from '../../../helpers/app-error';

describe('InventarioController', () => {
  let controller: InventarioController;
  let mockInventarioService: any;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockInventarioService = {
      registrarStockIngrediente: jest.fn(),
      ajustarStock: jest.fn(),
      listarMovimientos: jest.fn(),
    };

    controller = new InventarioController(mockInventarioService);
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  describe('registrarStockIngrediente', () => {
    it('deberia pasar lote y fecha_vencimiento al servicio', async () => {
      const req = {
        body: {
          id_ingrediente: 1,
          id_bodega: 2,
          cantidad: 30,
          stock_minimo: 5,
          stock_maximo: 100,
          lote: ' LOTE-2026-001 ',
          fecha_vencimiento: '2026-12-31',
        },
        usuario: { id_usuario: 9 },
      } as any;

      await controller.registrarStockIngrediente(req, res);

      expect(mockInventarioService.registrarStockIngrediente).toHaveBeenCalledWith(
        {
          id_ingrediente: 1,
          id_bodega: 2,
          cantidad: 30,
          stock_minimo: 5,
          stock_maximo: 100,
          lote: 'LOTE-2026-001',
          fecha_vencimiento: '2026-12-31',
        },
        9
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Stock registrado correctamente' });
    });
  });

  describe('ajustarStock (endpoint HU-17)', () => {
    it('deberia retornar 400 cuando el id es invalido', async () => {
      const req = { params: { id: 'abc' }, body: {}, usuario: { id_usuario: 1, rol: 'ADMIN', id_sucursal: 1 } } as any;

      await controller.ajustarStock(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'ID de inventario inválido' });
    });

    it('deberia retornar 400 cuando falta nota o nueva_cantidad', async () => {
      const req = { params: { id: '10' }, body: { nueva_cantidad: 4 }, usuario: { id_usuario: 1, rol: 'ADMIN', id_sucursal: 1 } } as any;

      await controller.ajustarStock(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Faltan campos requeridos: nueva_cantidad, nota' });
    });

    it('deberia retornar 400 cuando la nota tiene menos de 10 caracteres', async () => {
      const req = { params: { id: '10' }, body: { nueva_cantidad: 4, nota: 'corta' }, usuario: { id_usuario: 1, rol: 'ADMIN', id_sucursal: 1 } } as any;

      await controller.ajustarStock(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'La nota es obligatoria y debe tener al menos 10 caracteres' });
    });

    it('deberia invocar servicio con payload normalizado y actor', async () => {
      const req = {
        params: { id: '10' },
        body: { nueva_cantidad: 8, nota: '  Ajuste por conteo validado de cierre  ' },
        usuario: { id_usuario: 12, rol: 'ENCARGADO', id_sucursal: 2 },
      } as any;

      await controller.ajustarStock(req, res);

      expect(mockInventarioService.ajustarStock).toHaveBeenCalledWith(
        10,
        { nueva_cantidad: 8, nota: 'Ajuste por conteo validado de cierre' },
        { id_usuario: 12, rol: 'ENCARGADO', id_sucursal: 2 }
      );
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Stock ajustado correctamente' });
    });

    it('deberia responder status del AppError', async () => {
      mockInventarioService.ajustarStock.mockRejectedValueOnce(new AppError('No permitido', 403));
      const req = {
        params: { id: '10' },
        body: { nueva_cantidad: 8, nota: 'Ajuste por conteo validado de cierre' },
        usuario: { id_usuario: 12, rol: 'ENCARGADO', id_sucursal: 2 },
      } as any;

      await controller.ajustarStock(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'No permitido' });
    });
  });

  describe('listarMovimientos', () => {
    it('deberia retornar 400 con limit invalido', async () => {
      const req = {
        query: { id_sucursal: '1', limit: '9999' },
        usuario: { rol: 'ADMIN', id_sucursal: 1 },
      } as any;

      await controller.listarMovimientos(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'limit inválido (1-500)' });
    });

    it('deberia consultar historial con filtros validos', async () => {
      const movimientos = [{ id_movimiento: 1, tipo: 'AJUSTE_POSITIVO' }];
      mockInventarioService.listarMovimientos.mockResolvedValueOnce(movimientos);

      const req = {
        query: {
          id_sucursal: '2',
          id_ingrediente: '7',
          id_bodega: '3',
          id_usuario: '9',
          desde: '2026-05-01',
          hasta: '2026-05-20',
          limit: '100',
        },
        usuario: { rol: 'ADMIN', id_sucursal: 1 },
      } as any;

      await controller.listarMovimientos(req, res);

      expect(mockInventarioService.listarMovimientos).toHaveBeenCalledWith(
        {
          id_sucursal: 2,
          id_ingrediente: 7,
          id_bodega: 3,
          id_usuario: 9,
          desde: '2026-05-01',
          hasta: '2026-05-20',
          limit: 100,
        },
        { rol: 'ADMIN', id_sucursal: 1 }
      );
      expect(res.json).toHaveBeenCalledWith(movimientos);
    });
  });
});
