import { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import { chatService } from '../services/index.js';
import { ApiError } from '../middleware/index.js';
import { sendMessageRequestSchema } from '@ai-support/shared';

export class ChatController {
  /**
   * Send a message and stream the response
   * POST /api/chat/messages
   */
  async sendMessage(c: Context) {
    const body = await c.req.json();
    const validated = sendMessageRequestSchema.parse(body);
    
    // Get user ID from header or use default for demo
    const userId = c.req.header('x-user-id') || validated.userId || 'user_demo';

    return streamSSE(c, async (stream) => {
      try {
        for await (const chunk of chatService.streamChat({
          userId,
          conversationId: validated.conversationId,
          message: validated.message,
        })) {
          await stream.writeSSE({
            event: chunk.type,
            data: JSON.stringify(chunk.data),
          });
        }
      } catch (error) {
        console.error('Stream error:', error);
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({
            message: error instanceof Error ? error.message : 'Stream error',
          }),
        });
      }
    });
  }

  /**
   * Send a message without streaming (for simpler clients)
   * POST /api/chat/messages/sync
   */
  async sendMessageSync(c: Context) {
    const body = await c.req.json();
    const validated = sendMessageRequestSchema.parse(body);
    
    const userId = c.req.header('x-user-id') || validated.userId || 'user_demo';

    const result = await chatService.chat({
      userId,
      conversationId: validated.conversationId,
      message: validated.message,
    });

    return c.json({
      success: true,
      data: result,
    });
  }
}

export const chatController = new ChatController();
