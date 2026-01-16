import { Context } from 'hono';
import { db } from '../db/client.js';

export class HealthController {
  /**
   * Health check endpoint
   * GET /api/health
   */
  async check(c: Context) {
    let dbStatus: 'up' | 'down' = 'down';
    
    try {
      await db.$queryRaw`SELECT 1`;
      dbStatus = 'up';
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    // AI service is considered up if we have an API key configured
    const aiStatus: 'up' | 'down' = process.env.OPENAI_API_KEY ? 'up' : 'down';

    const status = dbStatus === 'up' && aiStatus === 'up' ? 'healthy' : 
                   dbStatus === 'up' || aiStatus === 'up' ? 'degraded' : 'unhealthy';

    const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;

    return c.json({
      status,
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        ai: aiStatus,
      },
    }, statusCode as any);
  }
}

export const healthController = new HealthController();
