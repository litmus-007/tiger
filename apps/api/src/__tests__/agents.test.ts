import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentType } from '@ai-support/shared';

// Mock the database
vi.mock('../db/client.js', () => ({
  db: {
    fAQ: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: '1',
          question: 'How do I reset my password?',
          answer: 'Go to settings...',
          category: 'account',
          keywords: ['password', 'reset'],
        },
      ]),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'user_demo',
        name: 'Demo User',
        email: 'demo@example.com',
        createdAt: new Date(),
        _count: { orders: 3, conversations: 2 },
      }),
    },
    order: {
      findUnique: vi.fn().mockResolvedValue({
        id: '1',
        orderNumber: 'ORD-2024-001',
        status: 'shipped',
        items: [{ name: 'Test Item', quantity: 1, price: 99.99 }],
        total: 99.99,
        shippingAddress: '123 Test St',
        trackingNumber: '1Z999AA1',
        estimatedDelivery: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: 'Demo User', email: 'demo@example.com' },
        payments: [{ status: 'completed' }],
      }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    payment: {
      findUnique: vi.fn().mockResolvedValue({
        id: '1',
        invoiceNumber: 'INV-2024-001',
        amount: 99.99,
        status: 'completed',
        method: 'credit_card',
        createdAt: new Date(),
        user: { name: 'Demo User', email: 'demo@example.com' },
        order: { orderNumber: 'ORD-2024-001', items: [] },
      }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    subscription: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    conversation: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: 'conv_1',
        userId: 'user_demo',
        title: null,
        summary: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      update: vi.fn(),
      delete: vi.fn(),
    },
    message: {
      create: vi.fn().mockResolvedValue({
        id: 'msg_1',
        conversationId: 'conv_1',
        role: 'user',
        content: 'Test message',
        agentType: null,
        toolCalls: null,
        toolResults: null,
        createdAt: new Date(),
      }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  },
}));

describe('Agent Types', () => {
  it('should have correct agent types', () => {
    expect(AgentType.SUPPORT).toBe('support');
    expect(AgentType.ORDER).toBe('order');
    expect(AgentType.BILLING).toBe('billing');
    expect(AgentType.ROUTER).toBe('router');
  });
});

describe('Support Tools', () => {
  it('should search FAQs', async () => {
    const { searchFAQs } = await import('../tools/support.tools.js');
    
    const result = await searchFAQs.execute({ query: 'password' }, {} as any);
    
    expect(result.found).toBe(true);
    expect(result.faqs).toHaveLength(1);
  });

  it('should get user info', async () => {
    const { getUserInfo } = await import('../tools/support.tools.js');
    
    const result = await getUserInfo.execute({ userId: 'user_demo' }, {} as any);
    
    expect(result.found).toBe(true);
    expect(result.user?.name).toBe('Demo User');
  });
});

describe('Order Tools', () => {
  it('should get order by number', async () => {
    const { getOrderByNumber } = await import('../tools/order.tools.js');
    
    const result = await getOrderByNumber.execute({ orderNumber: 'ORD-2024-001' }, {} as any);
    
    expect(result.found).toBe(true);
    expect(result.order?.orderNumber).toBe('ORD-2024-001');
  });

  it('should check delivery status', async () => {
    const { checkDeliveryStatus } = await import('../tools/order.tools.js');
    
    const result = await checkDeliveryStatus.execute({ orderNumber: 'ORD-2024-001' }, {} as any);
    
    expect(result.found).toBe(true);
    expect(result.delivery?.trackingNumber).toBe('1Z999AA1');
  });
});

describe('Billing Tools', () => {
  it('should get invoice details', async () => {
    const { getInvoiceDetails } = await import('../tools/billing.tools.js');
    
    const result = await getInvoiceDetails.execute({ invoiceNumber: 'INV-2024-001' }, {} as any);
    
    expect(result.found).toBe(true);
    expect(result.invoice?.amount).toBe(99.99);
  });
});

describe('Conversation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new conversation', async () => {
    const { conversationService } = await import('../services/conversation.service.js');
    
    const conversation = await conversationService.createConversation('user_demo', 'Test');
    
    expect(conversation.id).toBe('conv_1');
    expect(conversation.userId).toBe('user_demo');
  });
});
