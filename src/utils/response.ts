import { Response } from 'express';
import { ApiSuccessResponse, ApiErrorResponse } from '../types';

/**
 * Sends a consistent success response.
 *
 * @param res   - Express Response object
 * @param data  - Payload to nest under `data`
 * @param status - HTTP status code (default 200)
 */
export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  const body: ApiSuccessResponse<T> = { success: true, data };
  res.status(status).json(body);
}

/**
 * Sends a consistent error response.
 *
 * @param res     - Express Response object
 * @param message - Human-readable error description
 * @param status  - HTTP status code (default 500)
 * @param details - Optional extra info (e.g. validation errors)
 */
export function sendError(
  res: Response,
  message: string,
  status = 500,
  details?: unknown,
): void {
  const body: ApiErrorResponse = { success: false, error: message, ...(details ? { details } : {}) };
  res.status(status).json(body);
}
