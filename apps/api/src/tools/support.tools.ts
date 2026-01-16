import { tool } from 'ai';
import { z } from 'zod';
import { db } from '../db/client.js';

/**
 * Support Agent Tools
 * These tools help the support agent handle general inquiries, FAQs, and troubleshooting
 */

export const searchFAQs = tool({
  description: 'Search the FAQ database for relevant answers to customer questions. Use keywords or phrases to find matching FAQs.',
  parameters: z.object({
    query: z.string().describe('Search query or keywords to find relevant FAQs'),
    category: z.string().optional().describe('Optional category filter: account, support, orders, billing'),
  }),
  execute: async ({ query, category }) => {
    const keywords = query.toLowerCase().split(/\s+/);
    
    const faqs = await db.fAQ.findMany({
      where: {
        AND: [
          category ? { category } : {},
          {
            OR: [
              { question: { contains: query, mode: 'insensitive' } },
              { answer: { contains: query, mode: 'insensitive' } },
              { keywords: { hasSome: keywords } },
            ],
          },
        ],
      },
      take: 5,
    });

    if (faqs.length === 0) {
      return { found: false, message: 'No FAQs found matching the query' };
    }

    return {
      found: true,
      count: faqs.length,
      faqs: faqs.map(faq => ({
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
      })),
    };
  },
});

export const getConversationHistory = tool({
  description: 'Retrieve the conversation history for the current user to understand context and previous interactions.',
  parameters: z.object({
    userId: z.string().describe('The user ID to retrieve conversation history for'),
    limit: z.number().optional().default(5).describe('Maximum number of recent conversations to retrieve'),
  }),
  execute: async ({ userId, limit }) => {
    const conversations = await db.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        messages: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (conversations.length === 0) {
      return { found: false, message: 'No previous conversations found for this user' };
    }

    return {
      found: true,
      count: conversations.length,
      conversations: conversations.map(conv => ({
        id: conv.id,
        title: conv.title,
        summary: conv.summary,
        lastActivity: conv.updatedAt,
        recentMessages: conv.messages.reverse().map(msg => ({
          role: msg.role,
          content: msg.content.substring(0, 200) + (msg.content.length > 200 ? '...' : ''),
          agentType: msg.agentType,
        })),
      })),
    };
  },
});

export const getUserInfo = tool({
  description: 'Get basic user information for personalization and verification.',
  parameters: z.object({
    userId: z.string().describe('The user ID to retrieve information for'),
  }),
  execute: async ({ userId }) => {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
            conversations: true,
          },
        },
      },
    });

    if (!user) {
      return { found: false, message: 'User not found' };
    }

    return {
      found: true,
      user: {
        name: user.name || 'Valued Customer',
        email: user.email,
        memberSince: user.createdAt,
        totalOrders: user._count.orders,
        previousConversations: user._count.conversations,
      },
    };
  },
});

export const supportTools = {
  searchFAQs,
  getConversationHistory,
  getUserInfo,
};
