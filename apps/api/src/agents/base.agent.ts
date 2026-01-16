import { CoreMessage, streamText, generateText, LanguageModel } from 'ai';
import type { AgentType } from '@ai-support/shared';

export interface AgentConfig {
  type: AgentType;
  name: string;
  description: string;
  systemPrompt: string;
  tools: Record<string, any>;
  model: LanguageModel;
}

export interface AgentContext {
  userId: string;
  conversationId: string;
  messages: CoreMessage[];
}

export interface AgentResponse {
  content: string;
  toolCalls?: Array<{ tool: string; args: Record<string, unknown>; result: unknown }>;
  reasoning?: string;
}

export abstract class BaseAgent {
  protected config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  get type(): AgentType {
    return this.config.type;
  }

  get name(): string {
    return this.config.name;
  }

  get description(): string {
    return this.config.description;
  }

  get capabilities(): string[] {
    return Object.entries(this.config.tools).map(([name, tool]) => {
      return `${name}: ${(tool as any).description || 'No description'}`;
    });
  }

  get toolsList(): Array<{ name: string; description: string }> {
    return Object.entries(this.config.tools).map(([name, tool]) => ({
      name,
      description: (tool as any).description || 'No description',
    }));
  }

  protected buildSystemPrompt(context: AgentContext): string {
    return `${this.config.systemPrompt}

Current Context:
- User ID: ${context.userId}
- Conversation ID: ${context.conversationId}

Guidelines:
- Be helpful, professional, and concise
- Use available tools to fetch real data when needed
- If you cannot help with a request, explain why clearly
- Always maintain a friendly and supportive tone`;
  }

  async *streamResponse(context: AgentContext): AsyncGenerator<{
    type: 'text_delta' | 'tool_call' | 'tool_result' | 'done';
    data: unknown;
  }> {
    const systemPrompt = this.buildSystemPrompt(context);
    const toolCalls: Array<{ tool: string; args: Record<string, unknown>; result: unknown }> = [];
    let fullText = '';

    const result = streamText({
      model: this.config.model,
      system: systemPrompt,
      messages: context.messages,
      tools: this.config.tools,
      maxSteps: 5,
      onStepFinish: async (step) => {
        if (step.toolCalls) {
          for (const toolCall of step.toolCalls) {
            const toolResult = step.toolResults?.find(
              (r) => r.toolCallId === toolCall.toolCallId
            );
            toolCalls.push({
              tool: toolCall.toolName,
              args: toolCall.args as Record<string, unknown>,
              result: toolResult?.result,
            });
          }
        }
      },
    });

    // Stream tool calls first
    for await (const part of (await result).fullStream) {
      if (part.type === 'tool-call') {
        yield {
          type: 'tool_call',
          data: { tool: part.toolName, args: part.args },
        };
      } else if (part.type === 'tool-result') {
        yield {
          type: 'tool_result',
          data: { tool: part.toolName, result: part.result },
        };
      } else if (part.type === 'text-delta') {
        fullText += part.textDelta;
        yield {
          type: 'text_delta',
          data: { delta: part.textDelta },
        };
      }
    }

    yield {
      type: 'done',
      data: { fullText, toolCalls },
    };
  }

  async generateResponse(context: AgentContext): Promise<AgentResponse> {
    const systemPrompt = this.buildSystemPrompt(context);
    const toolCalls: Array<{ tool: string; args: Record<string, unknown>; result: unknown }> = [];

    const result = await generateText({
      model: this.config.model,
      system: systemPrompt,
      messages: context.messages,
      tools: this.config.tools,
      maxSteps: 5,
      onStepFinish: async (step) => {
        if (step.toolCalls) {
          for (const toolCall of step.toolCalls) {
            const toolResult = step.toolResults?.find(
              (r) => r.toolCallId === toolCall.toolCallId
            );
            toolCalls.push({
              tool: toolCall.toolName,
              args: toolCall.args as Record<string, unknown>,
              result: toolResult?.result,
            });
          }
        }
      },
    });

    return {
      content: result.text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }
}
