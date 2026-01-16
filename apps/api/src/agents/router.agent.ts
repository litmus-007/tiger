import { generateText, LanguageModel } from 'ai';
import { z } from 'zod';
import { tool } from 'ai';
import type { AgentType } from '@ai-support/shared';
import { BaseAgent, AgentContext } from './base.agent.js';
import { SupportAgent } from './support.agent.js';
import { OrderAgent } from './order.agent.js';
import { BillingAgent } from './billing.agent.js';

const routingSchema = z.object({
  agent: z.enum(['support', 'order', 'billing']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

type RoutingResult = z.infer<typeof routingSchema>;

const ROUTER_SYSTEM_PROMPT = `You are a Router Agent that analyzes customer queries and delegates them to the appropriate specialized agent.

Available Agents:
1. SUPPORT Agent: Handles general inquiries, FAQs, troubleshooting, account questions, how-to questions
2. ORDER Agent: Handles order status, tracking, delivery, order modifications, cancellations, returns
3. BILLING Agent: Handles payments, invoices, refunds, subscriptions, billing issues

Your Task:
Analyze the customer's message and determine which agent should handle it.

Classification Guidelines:
- Keywords like "track", "order", "delivery", "shipping", "cancel order", "modify order" → ORDER
- Keywords like "payment", "invoice", "refund", "subscription", "billing", "charge", "receipt" → BILLING  
- Keywords like "how do I", "help", "problem", "issue", "question", "account", "password", "FAQ" → SUPPORT
- If unclear or could be multiple, prefer SUPPORT as the fallback

Consider conversation context when routing - if the user continues discussing the same topic, route to the same agent.`;

export class RouterAgent {
  private model: LanguageModel;
  private supportAgent: SupportAgent;
  private orderAgent: OrderAgent;
  private billingAgent: BillingAgent;

  constructor(model: LanguageModel) {
    this.model = model;
    this.supportAgent = new SupportAgent(model);
    this.orderAgent = new OrderAgent(model);
    this.billingAgent = new BillingAgent(model);
  }

  getAgent(type: AgentType): BaseAgent | null {
    switch (type) {
      case 'support':
        return this.supportAgent;
      case 'order':
        return this.orderAgent;
      case 'billing':
        return this.billingAgent;
      default:
        return null;
    }
  }

  getAllAgents(): BaseAgent[] {
    return [this.supportAgent, this.orderAgent, this.billingAgent];
  }

  async route(context: AgentContext): Promise<{
    agent: BaseAgent;
    routing: RoutingResult;
  }> {
    // Get the last user message for classification
    const lastUserMessage = [...context.messages]
      .reverse()
      .find((m) => m.role === 'user');

    if (!lastUserMessage) {
      return {
        agent: this.supportAgent,
        routing: {
          agent: 'support',
          confidence: 1,
          reasoning: 'No user message found, defaulting to support',
        },
      };
    }

    // Check conversation history for context
    const recentAgentMessages = context.messages
      .filter((m) => m.role === 'assistant')
      .slice(-3);

    const conversationContext = recentAgentMessages.length > 0
      ? `Recent conversation has been with agents handling previous queries.`
      : 'This is the start of the conversation.';

    const routeTool = tool({
      description: 'Route the query to the appropriate agent',
      parameters: routingSchema,
      execute: async (params) => params,
    });

    const result = await generateText({
      model: this.model,
      system: ROUTER_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Context: ${conversationContext}

Current user message: "${typeof lastUserMessage.content === 'string' ? lastUserMessage.content : JSON.stringify(lastUserMessage.content)}"

Analyze this message and route it to the appropriate agent. Call the route tool with your decision.`,
        },
      ],
      tools: { route: routeTool },
      toolChoice: { type: 'tool', toolName: 'route' },
    });

    // Extract routing decision from tool call
    const toolCall = result.toolCalls?.[0];
    
    if (toolCall && toolCall.toolName === 'route') {
      const routing = toolCall.args as RoutingResult;
      const agent = this.getAgent(routing.agent) || this.supportAgent;
      
      return { agent, routing };
    }

    // Fallback to support if routing fails
    return {
      agent: this.supportAgent,
      routing: {
        agent: 'support',
        confidence: 0.5,
        reasoning: 'Could not determine intent, defaulting to support',
      },
    };
  }

  async *processMessage(context: AgentContext): AsyncGenerator<{
    type: 'routing' | 'thinking' | 'tool_call' | 'tool_result' | 'text_delta' | 'done' | 'error';
    data: unknown;
  }> {
    try {
      // First, route the message
      yield { type: 'thinking', data: { message: 'Analyzing your request...' } };
      
      const { agent, routing } = await this.route(context);

      yield {
        type: 'routing',
        data: {
          agent: agent.type,
          agentName: agent.name,
          reason: routing.reasoning,
          confidence: routing.confidence,
        },
      };

      yield { type: 'thinking', data: { message: `Connecting you with ${agent.name}...` } };

      // Stream response from the selected agent
      for await (const chunk of agent.streamResponse(context)) {
        yield chunk;
      }
    } catch (error) {
      yield {
        type: 'error',
        data: {
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
      };
    }
  }

  async generateResponse(context: AgentContext): Promise<{
    agent: AgentType;
    routing: RoutingResult;
    response: {
      content: string;
      toolCalls?: Array<{ tool: string; args: Record<string, unknown>; result: unknown }>;
    };
  }> {
    const { agent, routing } = await this.route(context);
    const response = await agent.generateResponse(context);

    return {
      agent: agent.type,
      routing,
      response,
    };
  }
}
