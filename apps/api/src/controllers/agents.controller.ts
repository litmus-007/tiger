import { Context } from 'hono';
import { chatService } from '../services/index.js';
import { ApiError } from '../middleware/index.js';
import type { AgentType } from '@ai-support/shared';

export class AgentsController {
  /**
   * List all available agents
   * GET /api/agents
   */
  async listAgents(c: Context) {
    const agents = chatService.getAgents();

    return c.json({
      success: true,
      data: {
        agents,
        total: agents.length,
      },
    });
  }

  /**
   * Get capabilities of a specific agent
   * GET /api/agents/:type/capabilities
   */
  async getAgentCapabilities(c: Context) {
    const type = c.req.param('type') as AgentType;
    
    const validTypes = ['support', 'order', 'billing'];
    if (!validTypes.includes(type)) {
      throw ApiError.badRequest(`Invalid agent type. Must be one of: ${validTypes.join(', ')}`);
    }

    const capabilities = chatService.getAgentCapabilities(type);
    
    if (!capabilities) {
      throw ApiError.notFound('Agent not found');
    }

    return c.json({
      success: true,
      data: capabilities,
    });
  }
}

export const agentsController = new AgentsController();
