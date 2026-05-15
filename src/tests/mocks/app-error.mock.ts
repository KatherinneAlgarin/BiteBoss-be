import { jest } from '@jest/globals';
import { AppError } from '../../helpers/app-error';

/**
 * ARCHIVO DE HELPERS PARA TESTING CON APPERROR
 *
 * ¿QUÉ HACE?
 *   Proporciona funciones auxiliares para crear y verificar instancias de AppError
 *   en los tests. AppError es la clase que usa la app para lanzar errores con
 *   status code (ej: 404, 500, 409).
 *
 * ¿CÓMO SE USA?
 *   - En los tests haces: await expect(...).rejects.toThrow(new AppError('mensaje', 500))
 *   - Estos helpers hacen más fácil crear esos errores de prueba
 */

// Crea un AppError con mensaje y código de estado (ej: 404, 500, 409)
export const createAppError = (message: string, statusCode: number): AppError => {
  return new AppError(message, statusCode);
};

// Versión spy: crea AppError pero también registra si fue llamada en los tests
export const mockAppErrorConstructor = jest.fn((message: string, statusCode: number) => {
  return new AppError(message, statusCode);
});

// Verifica si un error es AppError (útil en validaciones de errores)
export const isAppError = (error: any): error is AppError => {
  return error instanceof AppError;
};