import express, { Router, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { envs } from '../config/envs';

interface Options {
  port: number;
  routes: Router;
}

export class Server {

  public readonly app = express();
  private serverListener?: any;
  private readonly port: number;
  private readonly routes: Router;

  constructor(options: Options) {
    const { port, routes } = options;
    this.port = port;
    this.routes = routes;
  }

  async start() {
    this.app.use(cors({
      origin: envs.ALLOWED_ORIGINS,
      credentials: true,
    }));

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use(this.routes);

    // Manejo global de errores — no expone detalles internos
    this.app.use((_err: Error, _req: Request, res: Response, _next: NextFunction) => {
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    });

    this.serverListener = this.app.listen(this.port, () => {
      console.log(`Servidor corriendo en http://localhost:${this.port}`);
    });
  }

  public close() {
    this.serverListener?.close();
  }
}
