import { Request, Response } from 'express';
import { ProductoService } from '../../services/producto.service';
import { validateCrearProducto, validateActualizarProducto } from '../../domain/validators/producto.validator';
import { AppError } from '../../helpers/app-error';

export class ProductoController {
  constructor(private readonly productoService = new ProductoService()) {}

  async listarProductos(req: Request, res: Response): Promise<void> {
    try {
      const actorRol = String(req.usuario?.rol ?? '').toUpperCase();
      const fromQuery = req.query?.id_sucursal ? Number(req.query.id_sucursal) : undefined;
      const querySucursal = fromQuery !== undefined && !Number.isNaN(fromQuery) && fromQuery > 0
        ? fromQuery
        : undefined;

      const id_sucursal = actorRol === 'ADMIN'
        ? querySucursal
        : req.usuario?.id_sucursal;

      const productos = await this.productoService.listarProductos(id_sucursal);
      res.json(productos);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async obtenerProducto(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const id_producto = parseInt(id as string, 10);
      if (isNaN(id_producto)) {
        res.status(400).json({ mensaje: 'ID de producto inválido' });
        return;
      }

      const producto = await this.productoService.obtenerProductoPorId(id_producto);
      if (!producto) {
        res.status(404).json({ mensaje: 'Producto no encontrado' });
        return;
      }

      res.json(producto);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async crearProducto(req: Request, res: Response): Promise<void> {
    const { data, error } = validateCrearProducto(req.body);
    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    const actorRol = String(req.usuario?.rol ?? '').toUpperCase();
    const actorSucursal = req.usuario?.id_sucursal;
    const sucursalesDestino = data!.ids_sucursales ?? (data!.id_sucursal ? [data!.id_sucursal] : []);
    if (actorRol !== 'ADMIN') {
      if (!actorSucursal) {
        res.status(400).json({ mensaje: 'No se pudo determinar la sucursal del usuario.' });
        return;
      }

      const fueraDeSucursal = sucursalesDestino.some(id => id !== actorSucursal);
      if (fueraDeSucursal) {
        res.status(403).json({ mensaje: 'No puedes crear productos para otra sucursal.' });
        return;
      }
    }

    try {
      const producto = await this.productoService.crearProducto(data!, {
        id_usuario: req.usuario?.id_usuario,
        id_usuario_sucursal: req.usuario?.id_usuario_sucursal,
      });
      res.status(201).json(producto);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async actualizarProducto(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const id_producto = parseInt(id as string, 10);
    if (isNaN(id_producto)) {
      res.status(400).json({ mensaje: 'ID de producto inválido' });
      return;
    }

    const { data, error } = validateActualizarProducto(req.body);
    if (error) {
      res.status(400).json({ mensaje: error });
      return;
    }

    const actorRol = String(req.usuario?.rol ?? '').toUpperCase();
    const actorSucursal = req.usuario?.id_sucursal;
    const sucursalesDestino = data!.ids_sucursales;
    if (actorRol && actorRol !== 'ADMIN') {
      if (!actorSucursal) {
        res.status(400).json({ mensaje: 'No se pudo determinar la sucursal del usuario.' });
        return;
      }

      const productoPerteneceASucursal = (this.productoService as any).productoPerteneceASucursal;
      if (typeof productoPerteneceASucursal === 'function') {
        const perteneceASucursal = await productoPerteneceASucursal.call(this.productoService, id_producto, actorSucursal);
        if (!perteneceASucursal) {
          res.status(403).json({ mensaje: 'Solo puedes editar productos de tu sucursal.' });
          return;
        }
      }
    }

    if (actorRol && actorRol !== 'ADMIN' && sucursalesDestino && sucursalesDestino.length > 0) {
      if (!actorSucursal) {
        res.status(400).json({ mensaje: 'No se pudo determinar la sucursal del usuario.' });
        return;
      }

      const fueraDeSucursal = sucursalesDestino.some(id => id !== actorSucursal);
      if (fueraDeSucursal) {
        res.status(403).json({ mensaje: 'No puedes actualizar productos para otra sucursal.' });
        return;
      }
    }

    try {
      const producto = await this.productoService.actualizarProducto(id_producto, data!, {
        id_usuario: req.usuario?.id_usuario,
        id_usuario_sucursal: req.usuario?.id_usuario_sucursal,
      });
      res.json(producto);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async obtenerSucursalesDeProducto(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const id_producto = parseInt(id as string, 10);
    if (isNaN(id_producto)) {
      res.status(400).json({ mensaje: 'ID de producto inválido' });
      return;
    }

    try {
      const sucursales = await this.productoService.obtenerSucursalesDeProducto(id_producto);
      res.json(sucursales);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async obtenerIngredientesDeProducto(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const id_producto = parseInt(id as string, 10);
    if (isNaN(id_producto)) {
      res.status(400).json({ mensaje: 'ID de producto inválido' });
      return;
    }

    try {
      const ingredientes = await this.productoService.obtenerIngredientesDeProducto(id_producto);
      res.json(ingredientes);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async obtenerComponentesCombo(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const id_producto = parseInt(id as string, 10);
    if (isNaN(id_producto)) {
      res.status(400).json({ mensaje: 'ID de producto inválido' });
      return;
    }

    try {
      const componentes = await this.productoService.obtenerComponentesCombo(id_producto);
      res.json(componentes);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async verificarDependenciasDesactivacion(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const id_producto = parseInt(id as string, 10);
    if (isNaN(id_producto)) {
      res.status(400).json({ mensaje: 'ID de producto inválido' });
      return;
    }

    try {
      const dependencias = await this.productoService.verificarDependenciasDesactivacion(id_producto);
      res.json(dependencias);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

  async eliminarProducto(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const id_producto = parseInt(id as string, 10);
    if (isNaN(id_producto)) {
      res.status(400).json({ mensaje: 'ID de producto inválido' });
      return;
    }

    const forzar = String(req.query?.forzar ?? '').toLowerCase() === 'true';

    try {
      await this.productoService.eliminarProducto(id_producto, {
        id_usuario: req.usuario?.id_usuario,
        forzar,
      });
      res.status(204).send();
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ mensaje: err.message });
        return;
      }
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  }

}