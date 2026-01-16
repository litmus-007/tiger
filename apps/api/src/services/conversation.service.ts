import { db } from '../db/client.js';
import { nanoid } from 'nanoid';
import type { Conversation, Message } from '@ai-support/shared';
import type { AgentType, MessageRole } from '@prisma/client';

export interface CreateMessageInput {
  conversationId: string;
  role: MessageRole;
  content: string;
  agentType?: AgentType | null;
  toolCalls?: unknown;
  toolResults?: unknown;
}

export class ConversationService {
  /**
   * Create a new conversation for a user
   */
  async createConversation(userId: string, title?: string): Promise<Conversation> {
    const conversation = await db.conversation.create({
      data: {
        userId,
        title,
      },
    });

    return this.mapConversation(conversation);
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
    });

    return conversation ? this.mapConversation(conversation) : null;
  }

  /**
   * Get conversation with all messages
   */
  async getConversationWithMessages(conversationId: string): Promise<{
    conversation: Conversation;
    messages: Message[];
  } | null> {
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) return null;

    return {
      conversation: this.mapConversation(conversation),
      messages: conversation.messages.map(this.mapMessage),
    };
  }

  /**
   * List all conversations for a user
   */
  async listConversations(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ conversations: Conversation[]; total: number }> {
    const [conversations, total] = await Promise.all([
      db.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      db.conversation.count({ where: { userId } }),
    ]);

    return {
      conversations: conversations.map(this.mapConversation),
      total,
    };
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    try {
      await db.conversation.delete({
        where: { id: conversationId },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(input: CreateMessageInput): Promise<Message> {
    const message = await db.message.create({
      data: {
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        agentType: input.agentType,
        toolCalls: input.toolCalls as any,
        toolResults: input.toolResults as any,
      },
    });

    // Update conversation timestamp
    await db.conversation.update({
      where: { id: input.conversationId },
      data: { updatedAt: new Date() },
    });

    return this.mapMessage(message);
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(
    conversationId: string,
    options?: { limit?: number; before?: string }
  ): Promise<Message[]> {
    const messages = await db.message.findMany({
      where: {
        conversationId,
        ...(options?.before ? { createdAt: { lt: new Date(options.before) } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: options?.limit || 50,
    });

    return messages.map(this.mapMessage);
  }

  /**
   * Update conversation title and summary
   */
  async updateConversation(
    conversationId: string,
    data: { title?: string; summary?: string }
  ): Promise<Conversation | null> {
    try {
      const conversation = await db.conversation.update({
        where: { id: conversationId },
        data,
      });
      return this.mapConversation(conversation);
    } catch {
      return null;
    }
  }

  /**
   * Generate a title for the conversation based on the first message
   */
  async generateTitle(conversationId: string): Promise<string> {
    const messages = await db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 2,
    });

    if (messages.length === 0) return 'New Conversation';

    const firstUserMessage = messages.find((m) => m.role === 'user');
    if (!firstUserMessage) return 'New Conversation';

    // Simple title generation - take first 50 chars of first message
    const content = firstUserMessage.content;
    const title = content.length > 50 ? content.substring(0, 47) + '...' : content;

    await this.updateConversation(conversationId, { title });

    return title;
  }

  // Helper methods to map database models to API types
  private mapConversation(conv: any): Conversation {
    return {
      id: conv.id,
      userId: conv.userId,
      title: conv.title,
      summary: conv.summary,
      metadata: conv.metadata,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
    };
  }

  private mapMessage(msg: any): Message {
    return {
      id: msg.id,
      conversationId: msg.conversationId,
      role: msg.role,
      content: msg.content,
      agentType: msg.agentType,
      toolCalls: msg.toolCalls,
      toolResults: msg.toolResults,
      createdAt: msg.createdAt.toISOString(),
    };
  }
}

export const conversationService = new ConversationService();
