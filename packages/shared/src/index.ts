import { z } from 'zod';

// ============ Agent Types ============
export const AgentType = {
  ROUTER: 'router',
  SUPPORT: 'support',
  ORDER: 'order',
  BILLING: 'billing',
} as const;

export type AgentType = (typeof AgentType)[keyof typeof AgentType];

export const agentTypeSchema = z.enum(['router', 'support', 'order', 'billing']);

// ============ Message Types ============
export const MessageRole = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
  TOOL: 'tool',
} as const;

export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];

export const messageRoleSchema = z.enum(['user', 'assistant', 'system', 'tool']);

// ============ Schemas ============
export const messageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: messageRoleSchema,
  content: z.string(),
  agentType: agentTypeSchema.nullable(),
  toolCalls: z.any().nullable(),
  toolResults: z.any().nullable(),
  createdAt: z.string().or(z.date()),
});

export const conversationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().nullable(),
  summary: z.string().nullable(),
  metadata: z.any().nullable(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

export const orderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  orderNumber: z.string(),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    price: z.number(),
  })),
  total: z.number(),
  shippingAddress: z.string(),
  trackingNumber: z.string().nullable(),
  estimatedDelivery: z.string().nullable(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});

export const paymentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  orderId: z.string().nullable(),
  invoiceNumber: z.string(),
  amount: z.number(),
  status: z.enum(['pending', 'completed', 'failed', 'refunded', 'partially_refunded']),
  method: z.string(),
  refundAmount: z.number().nullable(),
  refundReason: z.string().nullable(),
  createdAt: z.string().or(z.date()),
});

export const subscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  plan: z.string(),
  status: z.enum(['active', 'cancelled', 'paused', 'expired']),
  currentPeriodStart: z.string().or(z.date()),
  currentPeriodEnd: z.string().or(z.date()),
  cancelAtPeriodEnd: z.boolean(),
  createdAt: z.string().or(z.date()),
});

// ============ API Request/Response Schemas ============
export const sendMessageRequestSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1),
  userId: z.string().optional(),
});

export const sendMessageResponseSchema = z.object({
  conversationId: z.string(),
  messageId: z.string(),
  agentType: agentTypeSchema,
  response: z.string(),
  reasoning: z.string().optional(),
  toolsUsed: z.array(z.string()).optional(),
});

export const conversationListResponseSchema = z.object({
  conversations: z.array(conversationSchema),
  total: z.number(),
});

export const agentCapabilitiesSchema = z.object({
  type: agentTypeSchema,
  name: z.string(),
  description: z.string(),
  capabilities: z.array(z.string()),
  tools: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })),
});

export const healthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string(),
  services: z.object({
    database: z.enum(['up', 'down']),
    ai: z.enum(['up', 'down']),
  }),
});

// ============ Type Exports ============
export type Message = z.infer<typeof messageSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type Order = z.infer<typeof orderSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;
export type SendMessageResponse = z.infer<typeof sendMessageResponseSchema>;
export type ConversationListResponse = z.infer<typeof conversationListResponseSchema>;
export type AgentCapabilities = z.infer<typeof agentCapabilitiesSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;

// ============ Streaming Event Types ============
export interface StreamEvent {
  type: 'thinking' | 'routing' | 'tool_call' | 'tool_result' | 'text_delta' | 'done' | 'error';
  data: unknown;
}

export interface ThinkingEvent extends StreamEvent {
  type: 'thinking';
  data: { message: string };
}

export interface RoutingEvent extends StreamEvent {
  type: 'routing';
  data: { agent: AgentType; reason: string };
}

export interface ToolCallEvent extends StreamEvent {
  type: 'tool_call';
  data: { tool: string; args: Record<string, unknown> };
}

export interface ToolResultEvent extends StreamEvent {
  type: 'tool_result';
  data: { tool: string; result: unknown };
}

export interface TextDeltaEvent extends StreamEvent {
  type: 'text_delta';
  data: { delta: string };
}

export interface DoneEvent extends StreamEvent {
  type: 'done';
  data: { messageId: string; fullText: string };
}

export interface ErrorEvent extends StreamEvent {
  type: 'error';
  data: { message: string; code?: string };
}
