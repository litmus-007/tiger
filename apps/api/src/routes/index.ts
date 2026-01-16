import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { chatController, conversationController, agentsController, healthController } from '../controllers/index.js';
import { chatRateLimit, apiRateLimit } from '../middleware/index.js';
import { sendMessageRequestSchema } from '@ai-support/shared';

// Create typed routes for Hono RPC
const chatRoutes = new Hono()
  // POST /api/chat/messages - Send message with streaming
  .post('/messages', chatRateLimit, async (c) => {
    return chatController.sendMessage(c);
  })
  // POST /api/chat/messages/sync - Send message without streaming
  .post(
    '/messages/sync',
    chatRateLimit,
    zValidator('json', sendMessageRequestSchema),
    async (c) => {
      return chatController.sendMessageSync(c);
    }
  )
  // GET /api/chat/conversations - List conversations
  .get('/conversations', apiRateLimit, async (c) => {
    return conversationController.listConversations(c);
  })
  // GET /api/chat/conversations/:id - Get conversation
  .get('/conversations/:id', apiRateLimit, async (c) => {
    return conversationController.getConversation(c);
  })
  // DELETE /api/chat/conversations/:id - Delete conversation
  .delete('/conversations/:id', apiRateLimit, async (c) => {
    return conversationController.deleteConversation(c);
  });

const agentRoutes = new Hono()
  // GET /api/agents - List agents
  .get('/', apiRateLimit, async (c) => {
    return agentsController.listAgents(c);
  })
  // GET /api/agents/:type/capabilities - Get agent capabilities
  .get('/:type/capabilities', apiRateLimit, async (c) => {
    return agentsController.getAgentCapabilities(c);
  });

const healthRoutes = new Hono()
  // GET /api/health - Health check
  .get('/', async (c) => {
    return healthController.check(c);
  });

// Main API router
export const apiRoutes = new Hono()
  .route('/chat', chatRoutes)
  .route('/agents', agentRoutes)
  .route('/health', healthRoutes);

// Export type for Hono RPC client
export type ApiRoutes = typeof apiRoutes;
