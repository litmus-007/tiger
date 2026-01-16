import { createOpenAI } from '@ai-sdk/openai';
import type { CoreMessage } from 'ai';
import type { AgentType } from '@ai-support/shared';
import { RouterAgent } from '../agents/index.js';
import { conversationService } from './conversation.service.js';

// Initialize OpenAI provider (compatible with various OpenAI-like APIs)
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder',
  baseURL: process.env.OPENAI_BASE_URL, // Optional: for OpenAI-compatible APIs
});

// Use GPT-4o-mini for cost efficiency, but can be changed to gpt-4o or others
const model = openai('gpt-4o-mini');

export interface ChatInput {
  userId: string;
  conversationId?: string;
  message: string;
}

export interface StreamChunk {
  type: 'routing' | 'thinking' | 'tool_call' | 'tool_result' | 'text_delta' | 'done' | 'error';
  data: unknown;
}

export class ChatService {
  private router: RouterAgent;

  constructor() {
    this.router = new RouterAgent(model);
  }

  /**
   * Process a chat message with streaming response
   */
  async *streamChat(input: ChatInput): AsyncGenerator<StreamChunk> {
    // Create or get conversation
    let conversationId = input.conversationId;
    
    if (!conversationId) {
      const conversation = await conversationService.createConversation(input.userId);
      conversationId = conversation.id;
      yield {
        type: 'thinking',
        data: { message: 'Starting new conversation...', conversationId },
      };
    }

    // Save user message
    await conversationService.addMessage({
      conversationId,
      role: 'user',
      content: input.message,
    });

    // Get conversation history for context
    const history = await conversationService.getMessages(conversationId);
    const messages: CoreMessage[] = history.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    // Process through router
    let fullResponse = '';
    let agentType: AgentType = 'support';
    let toolCalls: any[] = [];

    for await (const chunk of this.router.processMessage({
      userId: input.userId,
      conversationId,
      messages,
    })) {
      if (chunk.type === 'routing') {
        agentType = (chunk.data as any).agent;
      }
      
      if (chunk.type === 'text_delta') {
        fullResponse += (chunk.data as any).delta;
      }

      if (chunk.type === 'tool_call' || chunk.type === 'tool_result') {
        toolCalls.push(chunk.data);
      }

      if (chunk.type === 'done') {
        const doneData = chunk.data as any;
        fullResponse = doneData.fullText || fullResponse;
        toolCalls = doneData.toolCalls || toolCalls;
      }

      yield chunk;
    }

    // Save assistant response
    const savedMessage = await conversationService.addMessage({
      conversationId,
      role: 'assistant',
      content: fullResponse,
      agentType: agentType as any,
      toolCalls: toolCalls.filter((t) => t.tool).length > 0 ? toolCalls : undefined,
    });

    // Generate title if this is a new conversation (only 2 messages: user + assistant)
    if (history.length === 1) {
      await conversationService.generateTitle(conversationId);
    }

    yield {
      type: 'done',
      data: {
        conversationId,
        messageId: savedMessage.id,
        agentType,
        fullText: fullResponse,
      },
    };
  }

  /**
   * Process a chat message without streaming (for simpler integrations)
   */
  async chat(input: ChatInput): Promise<{
    conversationId: string;
    messageId: string;
    agentType: AgentType;
    response: string;
    toolsUsed: string[];
  }> {
    // Create or get conversation
    let conversationId = input.conversationId;
    
    if (!conversationId) {
      const conversation = await conversationService.createConversation(input.userId);
      conversationId = conversation.id;
    }

    // Save user message
    await conversationService.addMessage({
      conversationId,
      role: 'user',
      content: input.message,
    });

    // Get conversation history for context
    const history = await conversationService.getMessages(conversationId);
    const messages: CoreMessage[] = history.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    // Process through router
    const result = await this.router.generateResponse({
      userId: input.userId,
      conversationId,
      messages,
    });

    // Save assistant response
    const savedMessage = await conversationService.addMessage({
      conversationId,
      role: 'assistant',
      content: result.response.content,
      agentType: result.agent as any,
      toolCalls: result.response.toolCalls,
    });

    // Generate title if this is a new conversation
    if (history.length === 1) {
      await conversationService.generateTitle(conversationId);
    }

    return {
      conversationId,
      messageId: savedMessage.id,
      agentType: result.agent,
      response: result.response.content,
      toolsUsed: result.response.toolCalls?.map((t) => t.tool) || [],
    };
  }

  /**
   * Get agent information
   */
  getAgents() {
    return this.router.getAllAgents().map((agent) => ({
      type: agent.type,
      name: agent.name,
      description: agent.description,
    }));
  }

  /**
   * Get agent capabilities
   */
  getAgentCapabilities(type: AgentType) {
    const agent = this.router.getAgent(type);
    if (!agent) return null;

    return {
      type: agent.type,
      name: agent.name,
      description: agent.description,
      capabilities: agent.capabilities,
      tools: agent.toolsList,
    };
  }
}

export const chatService = new ChatService();
