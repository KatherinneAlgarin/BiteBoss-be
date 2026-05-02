import { Router } from 'express';
import supabase from '../config/supabase';

export class AppRoutes {

  static get routes(): Router {
    const router = Router();

    // Ruta de prueba
    router.get('/api', (_req, res) => {
      res.json({ mensaje: 'API Restaurante funcionando' });
    });

    // Probar conexión a Supabase
    router.get('/api/test-db', async (_req, res) => {
      try {
        const { data, error } = await supabase
          .from('rol')
          .select('*');

        if (error) throw error;

        res.json({
          mensaje: 'Conexión a Supabase exitosa',
          roles: data,
        });
      } catch (error: any) {
        res.status(500).json({
          mensaje: 'Error conectando a Supabase',
          error: error.message,
        });
      }
    });

    return router;
  }
}