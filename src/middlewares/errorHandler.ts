import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { config } from '../config/config';

/**
 * Custom error class that carries an HTTP status code.
 * Throw this from any service or controller to propagate
 * a meaningful HTTP response through the global error handler.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    // Restore prototype chain broken by extending Error
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Global Express error-handling middleware.
 *
 * Must have exactly 4 parameters so Express recognises it as an error handler.
 * Register this LAST in app.ts, after all routes.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Known, operational errors thrown by AppError
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode);
    return;
  }

  // Prisma known request errors (e.g. record not found)
  if (err.constructor?.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as Error & { code?: string };

    if (prismaErr.code === 'P2025') {
      sendError(res, 'Record not found', 404);
      return;
    }

    if (prismaErr.code === 'P2002') {
      sendError(res, 'A record with this value already exists', 409);
      return;
    }
  }

  // Unexpected / programming errors — log & hide details in production
  console.error('[Unhandled Error]', err);

  sendError(
    res,
    'Internal server error',
    500,
    config.isDev ? { stack: err.stack, message: err.message } : undefined,
  );
}
