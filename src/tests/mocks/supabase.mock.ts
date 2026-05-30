import { jest } from '@jest/globals';

/**
 * Crea un mock falso de Supabase que simula las consultas a la base de datos.
 *
 * ¿QUÉ HACE?
 *   Cuando un servicio llama a supabase.from().select().eq(), en vez de conectarse
 *   a la BD real, conecta a este mock. Las respuestas están pre-configuradas en tests
 *   con mockResolvedValueOnce({ data, error }).
 *
 * ¿CÓMO FUNCIONA?
 *   1. Los métodos (select, eq, insert, etc.) se encadenan y devuelven el queryBuilder
 *   2. El queryBuilder es "awaitable" (se puede hacer await query)
 *   3. Cada await consume un resultado pre-configurado en orden FIFO (primero en, primero salido)
 *   4. Esto permite simular múltiples consultas en secuencia sin conectar a BD real
 */
export const createSupabaseMock = () => {
  const resultQueue: Array<{ data: any; error: any }> = [];

  // Crea los métodos de Supabase (select, eq, insert, etc.)
  const queryBuilder: any = {
    select: jest.fn(),
    eq: jest.fn(),
    neq: jest.fn(),
    in: jest.fn(),
    not: jest.fn(),
    contains: jest.fn(),
    ilike: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
  };

  // Todos los métodos devuelven el mismo queryBuilder para permitir encadenamiento
  // (así se puede hacer: supabase.from().select().eq().order())
  Object.values(queryBuilder).forEach((method) => {
    if (jest.isMockFunction(method)) {
      (method as any).mockReturnValue(queryBuilder);
    }
  });

  // single() y maybeSingle() retornan Promise (últimos en la cadena)
  queryBuilder.single.mockImplementation(() =>
    Promise.resolve({ data: null, error: null })
  );
  queryBuilder.maybeSingle.mockImplementation(() =>
    Promise.resolve({ data: null, error: null })
  );

  // Hace que queryBuilder sea awaitable: extrae un resultado de la cola cada vez
  queryBuilder.then = (resolve: any, reject: any) => {
    const result = resultQueue.shift() ?? { data: null, error: null };
    return Promise.resolve(result).then(resolve, reject);
  };

  // Agrega un resultado a la cola para ser consumido en el próximo await
  queryBuilder.mockResult = (value: { data: any; error: any }) => {
    resultQueue.push(value);
    return queryBuilder;
  };

  return {
    from: jest.fn().mockReturnValue(queryBuilder),
    auth: {
      admin: {
        createUser: jest.fn(),
        deleteUser: jest.fn(),
        updateUserById: jest.fn(),
      },
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  };
};

/**
 * Helper para simular respuesta exitosa de una consulta
 */
export const mockSuccessResponse = (data: any) => ({
  data,
  error: null,
});

/**
 * Helper para simular un error en Supabase
 */
export const mockErrorResponse = (message: string, code?: string) => ({
  data: null,
  error: {
    message,
    code: code || 'ERROR',
  },
});
