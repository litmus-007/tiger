import { Context, Next } from 'hono';
import { ApiError } from './error.middleware.js';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

// Simple in-memory rate limiter (use Redis in production)
const rateLimitStore = new Map<string, RateLimitStore>();

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (c: Context) => string; // Custom key generator
  message?: string; // Custom error message
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  message: 'Too many requests, please try again later',
};

/**
 * Rate limiting middleware factory
 */
export function rateLimit(config: Partial<RateLimitConfig> = {}) {
  const { windowMs, maxRequests, keyGenerator, message } = {
    ...defaultConfig,
    ...config,
  };

  // Cleanup old entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, windowMs);

  return async (c: Context, next: Next) => {
    // Generate key for rate limiting (default: IP + path)
    const key = keyGenerator
      ? keyGenerator(c)
      : `${c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'}:${c.req.path}`;

    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      // New window
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
    } else {
      // Existing window
      entry.count++;

      if (entry.count > maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        
        c.header('Retry-After', retryAfter.toString());
        c.header('X-RateLimit-Limit', maxRequests.toString());
        c.header('X-RateLimit-Remaining', '0');
        c.header('X-RateLimit-Reset', entry.resetTime.toString());

        throw ApiError.tooManyRequests(message);
      }
    }

    // Add rate limit headers
    const current = rateLimitStore.get(key)!;
    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', Math.max(0, maxRequests - current.count).toString());
    c.header('X-RateLimit-Reset', current.resetTime.toString());

    await next();
  };
}

/**
 * Stricter rate limit for chat endpoints
 */
export const chatRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 messages per minute
  keyGenerator: (c) => {
    const userId = c.req.header('x-user-id') || 'anonymous';
    return `chat:${userId}`;
  },
  message: 'You are sending messages too quickly. Please wait a moment.',
});

/**
 * Standard API rate limit
 */
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 100,
});
