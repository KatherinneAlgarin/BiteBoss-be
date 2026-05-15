import { jest } from '@jest/globals';
import { AppError } from '../../helpers/app-error';

/**
 * Factory para crear instancias de AppError en tests
 * Útil para validar que los errores se lanzan correctamente
 */
export const createAppError = (message: string, statusCode: number): AppError => {
  return new AppError(message, statusCode);
};

/**
 * Mock del constructor de AppError para tracking en tests
 */
export const mockAppErrorConstructor = jest.fn((message: string, statusCode: number) => {
  return new AppError(message, statusCode);
});

/**
 * Helper para verificar si un error es AppError
 */
export const isAppError = (error: any): error is AppError => {
  return error instanceof AppError;
};