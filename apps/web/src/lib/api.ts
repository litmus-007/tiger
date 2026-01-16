import { hc } from 'hono/client';
import type { Message, Conversation, AgentType } from '@ai-support/shared';

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || '';

// Types for streaming events
export interface StreamEvent {
  type: 'thinking' | 'routing' | 'tool_call' | 'tool_result' | 'text_delta' | 'done' | 'error';
  data: unknown;
}

export interface ThinkingData {
  message: string;
  conversationId?: string;
}

export interface RoutingData {
  agent: AgentType;
  agentName: string;
  reason: string;
  confidence: number;
}

export interface ToolCallData {
  tool: string;
  args: Record<string, unknown>;
}

export interface ToolResultData {
  tool: string;
  result: unknown;
}

export interface TextDeltaData {
  delta: string;
}

export interface DoneData {
  conversationId: string;
  messageId: string;
  agentType: AgentType;
  fullText: string;
}

export interface ErrorData {
  message: string;
  code?: string;
}

// API client
export const api = {
  // Send a message and stream the response
  async *streamMessage(
    message: string,
    conversationId?: string,
    userId?: string
  ): AsyncGenerator<StreamEvent> {
    const response = await fetch(`${API_BASE}/api/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userId && { 'X-User-Id': userId }),
      },
      body: JSON.stringify({
        message,
        conversationId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          const eventType = line.slice(7);
          continue;
        }
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            // Get the event type from the previous line
            const eventLine = lines[lines.indexOf(line) - 1];
            const eventType = eventLine?.startsWith('event: ')
              ? eventLine.slice(7)
              : 'unknown';
            yield { type: eventType as StreamEvent['type'], data: parsed };
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  },

  // Send a message without streaming
  async sendMessage(
    message: string,
    conversationId?: string,
    userId?: string
  ): Promise<{
    conversationId: string;
    messageId: string;
    agentType: AgentType;
    response: string;
    toolsUsed: string[];
  }> {
    const response = await fetch(`${API_BASE}/api/chat/messages/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userId && { 'X-User-Id': userId }),
      },
      body: JSON.stringify({
        message,
        conversationId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  },

  // Get conversation list
  async getConversations(userId?: string): Promise<{
    conversations: Conversation[];
    total: number;
  }> {
    const response = await fetch(`${API_BASE}/api/chat/conversations`, {
      headers: {
        ...(userId && { 'X-User-Id': userId }),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  },

  // Get conversation with messages
  async getConversation(
    conversationId: string
  ): Promise<{
    conversation: Conversation;
    messages: Message[];
  }> {
    const response = await fetch(
      `${API_BASE}/api/chat/conversations/${conversationId}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  },

  // Delete conversation
  async deleteConversation(conversationId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE}/api/chat/conversations/${conversationId}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  },

  // Get agents
  async getAgents(): Promise<{
    agents: Array<{
      type: AgentType;
      name: string;
      description: string;
    }>;
    total: number;
  }> {
    const response = await fetch(`${API_BASE}/api/agents`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  },

  // Get agent capabilities
  async getAgentCapabilities(type: AgentType): Promise<{
    type: AgentType;
    name: string;
    description: string;
    capabilities: string[];
    tools: Array<{ name: string; description: string }>;
  }> {
    const response = await fetch(`${API_BASE}/api/agents/${type}/capabilities`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  },

  // Health check
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    services: {
      database: 'up' | 'down';
      ai: 'up' | 'down';
    };
  }> {
    const response = await fetch(`${API_BASE}/api/health`);
    return response.json();
  },
};
