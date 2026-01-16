import { Context } from 'hono';
import { conversationService } from '../services/index.js';
import { ApiError } from '../middleware/index.js';

export class ConversationController {
  /**
   * Get conversation by ID with messages
   * GET /api/chat/conversations/:id
   */
  async getConversation(c: Context) {
    const conversationId = c.req.param('id');
    
    const result = await conversationService.getConversationWithMessages(conversationId);
    
    if (!result) {
      throw ApiError.notFound('Conversation not found');
    }

    return c.json({
      success: true,
      data: result,
    });
  }

  /**
   * List all conversations for a user
   * GET /api/chat/conversations
   */
  async listConversations(c: Context) {
    const userId = c.req.header('x-user-id') || 'user_demo';
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');

    const result = await conversationService.listConversations(userId, { limit, offset });

    return c.json({
      success: true,
      data: result,
    });
  }

  /**
   * Delete a conversation
   * DELETE /api/chat/conversations/:id
   */
  async deleteConversation(c: Context) {
    const conversationId = c.req.param('id');
    
    const deleted = await conversationService.deleteConversation(conversationId);
    
    if (!deleted) {
      throw ApiError.notFound('Conversation not found');
    }

    return c.json({
      success: true,
      message: 'Conversation deleted successfully',
    });
  }
}

export const conversationController = new ConversationController();
