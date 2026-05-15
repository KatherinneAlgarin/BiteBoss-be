import { UsuarioController } from '../../../presentation/usuario/usuario.controller';
import { AppError } from '../../../helpers/app-error';

jest.mock('../../../domain/validators/usuario.validator', () => ({
  validateCrearUsuario: jest.fn(),
  validateActualizarPerfil: jest.fn(),
}));

const usuarioValidator = require('../../../domain/validators/usuario.validator');

const usuarioBase = { id_usuario: 1, nombre: 'Ana', apellido: 'García', email: 'ana@test.com', rol: 'mesero' };
const usuarioAuth = { id_usuario: 1, id_sucursal: 1, rol: 'admin' };

describe('UsuarioController', () => {
  let controller: UsuarioController;
  let mockUsuarioService: any;
  let res: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsuarioService = {
      listarUsuarios: jest.fn(),
      listarRoles: jest.fn(),
      crearUsuario: jest.fn(),
      obtenerPerfil: jest.fn(),
      actualizarPerfil: jest.fn(),
    };
    controller = new UsuarioController(mockUsuarioService);
    res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
    usuarioValidator.validateCrearUsuario.mockReturnValue({
      data: { nombre: 'Ana', apellido: 'García', email: 'ana@test.com', rol: 'mesero', id_sucursal: 1 },
      error: null,
    });
    usuarioValidator.validateActualizarPerfil.mockReturnValue({
      data: { nombre: 'Ana', apellido: 'García' },
      error: null,
    });
  });

  describe('listarUsuarios', () => {
    it('debería listar todos los usuarios si es admin', async () => {
      mockUsuarioService.listarUsuarios.mockResolvedValueOnce([usuarioBase]);
      const req = { usuario: { ...usuarioAuth, rol: 'admin' } } as any;
      await controller.listarUsuarios(req, res);
      expect(res.json).toHaveBeenCalledWith([usuarioBase]);
      expect(mockUsuarioService.listarUsuarios).toHaveBeenCalledWith(usuarioAuth.id_sucursal, true);
    });

    it('debería listar usuarios de su sucursal si no es admin', async () => {
      mockUsuarioService.listarUsuarios.mockResolvedValueOnce([usuarioBase]);
      const req = { usuario: { ...usuarioAuth, rol: 'mesero' } } as any;
      await controller.listarUsuarios(req, res);
      expect(mockUsuarioService.listarUsuarios).toHaveBeenCalledWith(usuarioAuth.id_sucursal, false);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockUsuarioService.listarUsuarios.mockRejectedValueOnce(new AppError('Error', 500));
      const req = { usuario: usuarioAuth } as any;
      await controller.listarUsuarios(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('debería responder 500 ante error inesperado', async () => {
      mockUsuarioService.listarUsuarios.mockRejectedValueOnce(new Error('boom'));
      const req = { usuario: usuarioAuth } as any;
      await controller.listarUsuarios(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('listarRoles', () => {
    it('debería retornar los roles disponibles', async () => {
      const roles = [{ id_rol: 1, nombre: 'admin' }];
      mockUsuarioService.listarRoles.mockResolvedValueOnce(roles);
      await controller.listarRoles({} as any, res);
      expect(res.json).toHaveBeenCalledWith(roles);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockUsuarioService.listarRoles.mockRejectedValueOnce(new AppError('Error', 500));
      await controller.listarRoles({} as any, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('crearUsuario', () => {
    it('debería retornar 400 si la validación falla', async () => {
      usuarioValidator.validateCrearUsuario.mockReturnValue({ data: null, error: 'Email requerido' });
      const req = { body: {} } as any;
      await controller.crearUsuario(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería crear el usuario y responder 201', async () => {
      /*
       * ¿QUÉ SE TESTEA?
       *   El método crearUsuario() del controller. A diferencia del service test,
       *   aquí NO nos interesa la lógica de negocio — eso ya fue testeado en el service.
       *   Aquí verificamos que el controller:
       *     1. Llame al validador con el body del request
       *     2. Si la validación pasa, llame al servicio
       *     3. Responda con HTTP 201 y el objeto creado
       *
       * ¿CÓMO FUNCIONA?
       *   El controller recibe un req (request HTTP) y un res (response HTTP).
       *   En el test ambos son objetos falsos:
       *
       *   - req: simula el request que llegaría de Express, con el body que mandaría
       *     el cliente. En este caso tiene datos de un usuario a crear.
       *
       *   - res: tiene funciones spías (jest.fn()) que registran si fueron llamadas
       *     y con qué argumentos. Con esto podemos verificar que el controller
       *     respondió con el status y body correctos sin levantar un servidor HTTP real.
       *
       *   - mockUsuarioService: el servicio está completamente reemplazado por un mock.
       *     mockResolvedValueOnce(usuarioBase) le dice: "la próxima vez que alguien
       *     llame a crearUsuario(), devuelve usuarioBase como resultado exitoso".
       *     Así el controller recibe un usuario y lo envía en la respuesta.
       *
       *   - El validator también está mockeado (jest.mock al inicio del archivo)
       *     y configurado en beforeEach para retornar { data: {...}, error: null },
       *     es decir, siempre valida como correcto salvo que el test lo cambie.
       */

      // ARRANGE: el servicio responderá con este objeto cuando sea llamado
      mockUsuarioService.crearUsuario.mockResolvedValueOnce(usuarioBase);

      // req simula el body HTTP que envía el cliente
      const req = { body: { nombre: 'Ana', email: 'ana@test.com', rol: 'mesero', id_sucursal: 1 } } as any;

      // ACT: ejecutar el método del controller
      await controller.crearUsuario(req, res);

      // ASSERT: verificar que res.status(201) y res.json(usuarioBase) fueron llamados
      // Si el controller hubiera llamado res.status(500) o res.json({error:...}), el test falla
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(usuarioBase);
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockUsuarioService.crearUsuario.mockRejectedValueOnce(new AppError('Email ya registrado', 409));
      const req = { body: {} } as any;
      await controller.crearUsuario(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('debería responder 500 ante error inesperado', async () => {
      mockUsuarioService.crearUsuario.mockRejectedValueOnce(new Error('boom'));
      const req = { body: {} } as any;
      await controller.crearUsuario(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('obtenerPerfil', () => {
    it('debería retornar el perfil del usuario autenticado', () => {
      const perfilMapeado = { id_usuario: 1, nombre: 'Ana' };
      mockUsuarioService.obtenerPerfil.mockReturnValue(perfilMapeado);
      const req = { usuario: usuarioAuth } as any;
      controller.obtenerPerfil(req, res);
      expect(res.json).toHaveBeenCalledWith(perfilMapeado);
      expect(mockUsuarioService.obtenerPerfil).toHaveBeenCalledWith(usuarioAuth);
    });
  });

  describe('actualizarPerfil', () => {
    it('debería retornar 400 si la validación falla', async () => {
      usuarioValidator.validateActualizarPerfil.mockReturnValue({ data: null, error: 'Nombre inválido' });
      const req = { usuario: usuarioAuth, body: {} } as any;
      await controller.actualizarPerfil(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debería actualizar el perfil y retornar mensaje', async () => {
      const perfilActualizado = { ...usuarioBase, nombre: 'Ana María' };
      mockUsuarioService.actualizarPerfil.mockResolvedValueOnce(perfilActualizado);
      const req = { usuario: usuarioAuth, body: { nombre: 'Ana María' } } as any;
      await controller.actualizarPerfil(req, res);
      expect(res.json).toHaveBeenCalledWith({
        mensaje: 'Perfil actualizado correctamente',
        usuario: perfilActualizado,
      });
    });

    it('debería responder con el statusCode del AppError', async () => {
      mockUsuarioService.actualizarPerfil.mockRejectedValueOnce(new AppError('Error', 500));
      const req = { usuario: usuarioAuth, body: { nombre: 'Ana' } } as any;
      await controller.actualizarPerfil(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('debería responder 500 ante error inesperado', async () => {
      mockUsuarioService.actualizarPerfil.mockRejectedValueOnce(new Error('boom'));
      const req = { usuario: usuarioAuth, body: { nombre: 'Ana' } } as any;
      await controller.actualizarPerfil(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
