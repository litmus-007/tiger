import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { apiRoutes } from './routes/index.js';
import { errorHandler, corsConfig } from './middleware/index.js';

// Create main app
const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors(corsConfig()));
app.use('*', errorHandler);

// Mount API routes
app.route('/api', apiRoutes);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'AI Support System API',
    version: '1.0.0',
    docs: '/api/health',
    endpoints: {
      chat: '/api/chat/messages',
      conversations: '/api/chat/conversations',
      agents: '/api/agents',
      health: '/api/health',
    },
  });
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        message: 'Not found',
        code: 'NOT_FOUND',
        status: 404,
      },
    },
    404
  );
});

// Start server
const port = parseInt(process.env.PORT || '3001');

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🤖 AI Support System API                                   ║
║                                                              ║
║   Server running at: http://localhost:${port}                  ║
║                                                              ║
║   Endpoints:                                                 ║
║   • POST /api/chat/messages     - Send message (streaming)   ║
║   • POST /api/chat/messages/sync - Send message (sync)       ║
║   • GET  /api/chat/conversations - List conversations        ║
║   • GET  /api/chat/conversations/:id - Get conversation      ║
║   • DELETE /api/chat/conversations/:id - Delete conversation ║
║   • GET  /api/agents            - List agents                ║
║   • GET  /api/agents/:type/capabilities - Agent capabilities ║
║   • GET  /api/health            - Health check               ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);

serve({
  fetch: app.fetch,
  port,
});

// Export for type inference
export type AppType = typeof app;
