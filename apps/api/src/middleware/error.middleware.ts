import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

export interface AppError {
  message: string;
  code: string;
  status: number;
  details?: unknown;
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
    this.name = 'ApiError';
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(message, 'BAD_REQUEST', 400, details);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(message, 'UNAUTHORIZED', 401);
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(message, 'FORBIDDEN', 403);
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(message, 'NOT_FOUND', 404);
  }

  static conflict(message: string, details?: unknown): ApiError {
    return new ApiError(message, 'CONFLICT', 409, details);
  }

  static tooManyRequests(message = 'Too many requests'): ApiError {
    return new ApiError(message, 'TOO_MANY_REQUESTS', 429);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(message, 'INTERNAL_ERROR', 500);
  }
}

/**
 * Global error handling middleware
 */
export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    console.error('Error caught in middleware:', error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return c.json(
        {
          success: false,
          error: {
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
            status: 400,
            details: error.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
        },
        400
      );
    }

    // Handle custom API errors
    if (error instanceof ApiError) {
      return c.json(
        {
          success: false,
          error: {
            message: error.message,
            code: error.code,
            status: error.status,
            details: error.details,
          },
        },
        error.status as any
      );
    }

    // Handle Hono HTTP exceptions
    if (error instanceof HTTPException) {
      return c.json(
        {
          success: false,
          error: {
            message: error.message,
            code: 'HTTP_EXCEPTION',
            status: error.status,
          },
        },
        error.status
      );
    }

    // Handle generic errors
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    return c.json(
      {
        success: false,
        error: {
          message,
          code: 'INTERNAL_ERROR',
          status: 500,
        },
      },
      500
    );
  }
}

/**
 * Request logging middleware
 */
export async function requestLogger(c: Context, next: Next) {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  console.log(`${method} ${path} ${status} ${duration}ms`);
}

/**
 * CORS middleware configuration
 */
export function corsConfig() {
  return {
    origin: process.env.CORS_ORIGIN || '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
    exposeHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400,
    credentials: true,
  };
}
