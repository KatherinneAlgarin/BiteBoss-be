import { UsuarioService } from '../../../services/usuario.service';
import { createSupabaseMock } from '../../mocks/supabase.mock';
import { AppError } from '../../../helpers/app-error';

jest.mock('../../../config/supabase');

describe('UsuarioService', () => {
  let usuarioService: UsuarioService;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createSupabaseMock();
    
    const supabaseModule = require('../../../config/supabase');
    supabaseModule.default = mockSupabase;
    
    usuarioService = new UsuarioService();
  });

  describe('listarRoles', () => {
    
    // ✅ CASOS CORRECTOS
    it('debería listar roles correctamente', async () => {
      const roles = [
        { id_rol: 1, nombre: 'Admin' },
        { id_rol: 2, nombre: 'Gerente' },
        { id_rol: 3, nombre: 'Mesero' },
      ];

      mockSupabase.from().select().order.mockResolvedValue({
        data: roles,
        error: null,
      });

      const resultado = await usuarioService.listarRoles();

      expect(resultado).toHaveLength(3);
      expect(resultado[0].nombre).toBe('Admin');
      expect(resultado[2].nombre).toBe('Mesero');
    });

    it('debería retornar array vacío si no hay roles', async () => {
      mockSupabase.from().select().order.mockResolvedValue({
        data: null,
        error: null,
      });

      const resultado = await usuarioService.listarRoles();

      expect(resultado).toEqual([]);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si falla obtener roles', async () => {
      mockSupabase.from().select().order.mockResolvedValue({
        data: null,
        error: { message: 'Error de BD' },
      });

      await expect(usuarioService.listarRoles()).rejects.toThrow(
        new AppError('Error al obtener roles', 500)
      );
    });
  });

  describe('listarUsuarios', () => {
    
    const usuariosResponse = [
      {
        id_usuario: 1,
        nombre: 'Juan Pérez',
        email: 'juan@example.com',
        activo: true,
        usuario_sucursal: [
          {
            id_usuario_sucursal: 1,
            rol: { id_rol: 1, nombre: 'Admin' },
            sucursal: { id_sucursal: 1, nombre: 'Sucursal Principal' },
          },
        ],
      },
      {
        id_usuario: 2,
        nombre: 'Maria Garcia',
        email: 'maria@example.com',
        activo: true,
        usuario_sucursal: [
          {
            id_usuario_sucursal: 2,
            rol: { id_rol: 2, nombre: 'Mesero' },
            sucursal: { id_sucursal: 1, nombre: 'Sucursal Principal' },
          },
        ],
      },
    ];

    // ✅ CASOS CORRECTOS
    it('debería listar usuarios activos', async () => {
      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: usuariosResponse,
        error: null,
      });

      const resultado = await usuarioService.listarUsuarios();

      expect(resultado).toHaveLength(2);
      expect(resultado[0].nombre).toBe('Juan Pérez');
      expect(resultado[0].rol).toBe('Admin');
    });

    it('debería filtrar por sucursal cuando es no admin', async () => {
      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: usuariosResponse,
        error: null,
      });

      const resultado = await usuarioService.listarUsuarios(1, false);

      expect(resultado).toBeDefined();
    });

    it('debería ignorar filtro de sucursal si es admin', async () => {
      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: usuariosResponse,
        error: null,
      });

      const resultado = await usuarioService.listarUsuarios(1, true);

      expect(resultado).toHaveLength(2);
    });

    it('debería retornar array vacío si no hay usuarios', async () => {
      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: null,
        error: null,
      });

      const resultado = await usuarioService.listarUsuarios();

      expect(resultado).toEqual([]);
    });

    // ❌ CASOS DE ERROR
    it('debería lanzar AppError si falla listar usuarios', async () => {
      mockSupabase.from().select().eq().order.mockResolvedValue({
        data: null,
        error: { message: 'Error de BD' },
      });

      await expect(usuarioService.listarUsuarios()).rejects.toThrow(
        new AppError('Error al obtener usuarios', 500)
      );
    });
  });

    describe('obtenerPerfil', () => {
    
    // ✅ CASOS CORRECTOS
    it('debería obtener perfil del usuario autenticado', () => {
      const authPayload = {
        auth_id: 'auth-123',
        id_usuario: 1,
        nombre: 'Juan Pérez',
        email: 'juan@example.com',
        id_rol: 1,
        rol: 'Admin',
        id_sucursal: 1,
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };

      const resultado = usuarioService.obtenerPerfil(authPayload);

      expect(resultado.nombre).toBe('Juan Pérez');
      expect(resultado.email).toBe('juan@example.com');
    });

    it('debería usar nombre vacío si no está definido', () => {
      const authPayload = {
        auth_id: 'auth-456',
        id_usuario: 1,
        email: 'user@example.com',
        id_rol: 2,
        rol: 'Mesero',
        id_sucursal: 1,
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };

      const resultado = usuarioService.obtenerPerfil(authPayload);

      expect(resultado.nombre).toBe('');
      expect(resultado.email).toBe('user@example.com');
    });
  });

  describe('crearUsuario', () => {
    
    const crearUsuarioDto = {
      nombre: 'Nuevo Usuario',
      email: 'nuevo@example.com',
      password: 'TempPass123',
      id_rol: 2,
      id_sucursal: 1,
    };

    // ✅ CASOS CORRECTOS
    it('debería crear usuario exitosamente', async () => {
      // Mock: email no existe
      mockSupabase.from().select().eq().limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Mock: crear en auth
      mockSupabase.auth.admin.createUser.mockResolvedValueOnce({
        data: { user: { id: 'auth-123' } },
        error: null,
      });

      // Mock: crear en tabla usuario
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id_usuario: 1 },
        error: null,
      });

      // Mock: crear asignación sucursal-rol
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id_usuario_sucursal: 1 },
        error: null,
      });

      // Mock: obtener nombre de rol
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { nombre: 'Mesero' },
        error: null,
      });

      // Mock: obtener nombre de sucursal
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { nombre: 'Sucursal Principal' },
        error: null,
      });

      // Mock: actualizar metadata
      mockSupabase.auth.admin.updateUserById.mockResolvedValueOnce({
        data: { user: {} },
        error: null,
      });

      const resultado = await usuarioService.crearUsuario(crearUsuarioDto);

      expect(resultado.id_usuario).toBe(1);
      expect(resultado.nombre).toBe('Nuevo Usuario');
      expect(resultado.email).toBe('nuevo@example.com');
      expect(resultado.rol).toBe('Mesero');
      expect(resultado.sucursal).toBe('Sucursal Principal');
    });

    // ❌ CASOS DE ERROR
    it('debería rechazar si email ya existe', async () => {
      mockSupabase.from().select().eq().limit.mockResolvedValueOnce({
        data: [{ id_usuario: 1 }],
        error: null,
      });

      await expect(usuarioService.crearUsuario(crearUsuarioDto)).rejects.toThrow(
        new AppError('El correo ingresado ya está registrado', 409)
      );
    });

    it('debería rechazar si auth.admin.createUser falla', async () => {
      mockSupabase.from().select().eq().limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      mockSupabase.auth.admin.createUser.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error creating user' },
      });

      await expect(usuarioService.crearUsuario(crearUsuarioDto)).rejects.toThrow(
        new AppError('Error al crear la cuenta de acceso', 500)
      );
    });

    it('debería rechazar si email ya está registrado en auth', async () => {
      mockSupabase.from().select().eq().limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      mockSupabase.auth.admin.createUser.mockResolvedValueOnce({
        data: null,
        error: { message: 'User already registered' },
      });

      await expect(usuarioService.crearUsuario(crearUsuarioDto)).rejects.toThrow(
        new AppError('El correo ingresado ya está registrado', 409)
      );
    });

    it('debería rollback si falla insertar usuario en BD', async () => {
      mockSupabase.from().select().eq().limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      mockSupabase.auth.admin.createUser.mockResolvedValueOnce({
        data: { user: { id: 'auth-123' } },
        error: null,
      });

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error inserting' },
      });

      mockSupabase.auth.admin.deleteUser.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(usuarioService.crearUsuario(crearUsuarioDto)).rejects.toThrow(
        new AppError('Error al registrar el usuario', 500)
      );

      expect(mockSupabase.auth.admin.deleteUser).toHaveBeenCalled();
    });
  });
});