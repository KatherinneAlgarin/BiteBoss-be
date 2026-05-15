import { jest } from '@jest/globals';

/**
 * Crea un mock reutilizable de Supabase.
 *
 * Patrones de uso:
 *
 * 1. Cadena simple con método terminal (el método final devuelve una Promise):
 *      mockSupabase.from().select().eq.mockResolvedValue({ data, error })
 *    Funciona porque eq() devuelve la Promise directamente.
 *
 * 2. Cadena con .single() al final:
 *      mockSupabase.from().insert().select().single.mockResolvedValueOnce({ data, error })
 *    Funciona porque single() devuelve la Promise directamente.
 *
 * 3. Cadenas con múltiples filtros encadenados (ej. .eq().eq(), .eq().in()):
 *      mockSupabase.from().mockResult({ data, error })
 *    El queryBuilder es "thenable": cuando el servicio hace `await query` donde
 *    query es el queryBuilder (los métodos devuelven queryBuilder por defecto),
 *    se usa la cola interna para resolver el valor.
 *    Llamar mockResult varias veces encola múltiples respuestas en orden FIFO.
 */
export const createSupabaseMock = () => {
  const resultQueue: Array<{ data: any; error: any }> = [];

  const queryBuilder: any = {
    select: jest.fn(),
    eq: jest.fn(),
    neq: jest.fn(),
    in: jest.fn(),
    not: jest.fn(),
    ilike: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
  };

  // Cada método devuelve la misma instancia para encadenamiento
  Object.values(queryBuilder).forEach((method) => {
    if (jest.isMockFunction(method)) {
      (method as any).mockReturnValue(queryBuilder);
    }
  });

  // single() y maybeSingle() devuelven una Promise por defecto
  queryBuilder.single.mockImplementation(() =>
    Promise.resolve({ data: null, error: null })
  );
  queryBuilder.maybeSingle.mockImplementation(() =>
    Promise.resolve({ data: null, error: null })
  );

  // Hace que queryBuilder sea "thenable" (awaitable) usando la cola de resultados.
  // Solo se invoca cuando el código hace `await query` donde query === queryBuilder
  // (es decir, el último método de la cadena devolvió queryBuilder, no una Promise).
  queryBuilder.then = (resolve: any, reject: any) => {
    const result = resultQueue.shift() ?? { data: null, error: null };
    return Promise.resolve(result).then(resolve, reject);
  };

  // Helper para encolar el resultado de un `await query` donde query termina en queryBuilder
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
