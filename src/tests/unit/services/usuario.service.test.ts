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
      /*
       * ¿QUÉ SE TESTEA?
       *   El método crearUsuario() del servicio. Este método hace VARIAS consultas a la
       *   base de datos en secuencia (verificar email, crear en auth, insertar en tabla,
       *   vincular rol/sucursal, etc.). Aquí probamos que todo el flujo funciona.
       *
       * ¿CÓMO FUNCIONA EL MOCK DE SUPABASE?
       *   En lugar de conectarse a una BD real, usamos createSupabaseMock() que devuelve
       *   un objeto falso que imita el cliente de Supabase. Cada consulta que hace el
       *   servicio consume un resultado de una cola FIFO (primero en entrar, primero en salir).
       *
       *   Por eso configuramos los mocks EN EL MISMO ORDEN en que el servicio los necesita:
       *
       *   Consulta 1 → verificar que el email no existe → retorna lista vacía (no duplicado)
       *   Consulta 2 → crear usuario en Supabase Auth → retorna { user: { id: 'auth-123' } }
       *   Consulta 3 → insertar en tabla 'usuario' → retorna el id generado
       *   Consulta 4 → insertar en 'usuario_sucursal' → retorna el vínculo creado
       *   Consulta 5 → obtener nombre del rol → retorna 'Mesero'
       *   Consulta 6 → obtener nombre de la sucursal → retorna 'Sucursal Principal'
       *   Consulta 7 → actualizar metadata en auth → confirma OK
       *
       *   Si el orden estuviera mal, el servicio recibiría la respuesta equivocada
       *   y el test fallaría — exactamente como pasaría con datos reales.
       *
       * ¿QUÉ VALORES SE USAN?
       *   Los datos de crearUsuarioDto (definidos arriba en el describe) son datos
       *   inventados que simulan lo que mandaría el frontend. Los IDs como 'auth-123'
       *   o 1 son cualquier valor que el servicio recibiría de Supabase.
       */

      // Consulta 1: verificar que el email no está registrado
      // from('usuario')       → tabla a consultar
      // .select()             → qué columnas traer
      // .eq('email', ...)     → WHERE email = 'nuevo@example.com'
      // .limit                → LIMIT 1 (solo necesita saber si existe o no)
      // data: []              → lista vacía significa que el email está libre (no duplicado)
      mockSupabase.from().select().eq().limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Consulta 2: crear la cuenta en Supabase Auth (sistema de autenticación)
      // auth.admin.createUser → crea el usuario en el sistema de login de Supabase
      // data.user.id          → el auth_id que Supabase genera ('auth-123' es inventado)
      mockSupabase.auth.admin.createUser.mockResolvedValueOnce({
        data: { user: { id: 'auth-123' } },
        error: null,
      });

      // Consulta 3: insertar el registro en la tabla 'usuario' de la BD propia
      // insert()              → INSERT INTO usuario (...)
      // .select().single()    → retorna la fila insertada
      // data: { id_usuario: 1 } → el ID que la BD asignó al nuevo registro
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id_usuario: 1 },
        error: null,
      });

      // Consulta 4: vincular usuario con sucursal y rol en tabla 'usuario_sucursal'
      // Es la tabla intermedia que relaciona usuario ↔ sucursal ↔ rol
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: { id_usuario_sucursal: 1 },
        error: null,
      });

      // Consulta 5: leer el nombre del rol para incluirlo en la respuesta final
      // .eq('id_rol', 2)      → WHERE id_rol = 2
      // .single()             → espera exactamente un resultado
      // data: { nombre: 'Mesero' } → el nombre que se mostrará en la respuesta
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { nombre: 'Mesero' },
        error: null,
      });

      // Consulta 6: leer el nombre de la sucursal para incluirlo en la respuesta final
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { nombre: 'Sucursal Principal' },
        error: null,
      });

      // Consulta 7: actualizar metadata del usuario en Supabase Auth (nombre, rol, etc.)
      // Esto sincroniza los datos del JWT con los datos del perfil
      mockSupabase.auth.admin.updateUserById.mockResolvedValueOnce({
        data: { user: {} },
        error: null,
      });

      // ACT: ejecutar el método con los datos de prueba
      const resultado = await usuarioService.crearUsuario(crearUsuarioDto);

      // ASSERT: verificar que el resultado tiene la forma esperada
      // Los valores vienen de los mocks que configuramos arriba, no de una BD real
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