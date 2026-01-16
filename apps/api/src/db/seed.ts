import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.order.deleteMany();
  await prisma.fAQ.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        id: 'user_demo',
        email: 'demo@example.com',
        name: 'Demo User',
      },
    }),
    prisma.user.create({
      data: {
        id: 'user_john',
        email: 'john@example.com',
        name: 'John Doe',
      },
    }),
    prisma.user.create({
      data: {
        id: 'user_jane',
        email: 'jane@example.com',
        name: 'Jane Smith',
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create orders
  const orders = await Promise.all([
    // Demo user orders
    prisma.order.create({
      data: {
        userId: 'user_demo',
        orderNumber: 'ORD-2024-001',
        status: 'delivered',
        items: [
          { name: 'Wireless Headphones', quantity: 1, price: 149.99 },
          { name: 'Phone Case', quantity: 2, price: 24.99 },
        ],
        total: 199.97,
        shippingAddress: '123 Main St, San Francisco, CA 94105',
        trackingNumber: '1Z999AA10123456784',
        estimatedDelivery: new Date('2024-12-20'),
      },
    }),
    prisma.order.create({
      data: {
        userId: 'user_demo',
        orderNumber: 'ORD-2024-002',
        status: 'shipped',
        items: [
          { name: 'Laptop Stand', quantity: 1, price: 79.99 },
          { name: 'USB-C Hub', quantity: 1, price: 59.99 },
        ],
        total: 139.98,
        shippingAddress: '123 Main St, San Francisco, CA 94105',
        trackingNumber: '1Z999AA10123456785',
        estimatedDelivery: new Date('2024-12-25'),
      },
    }),
    prisma.order.create({
      data: {
        userId: 'user_demo',
        orderNumber: 'ORD-2024-003',
        status: 'processing',
        items: [
          { name: 'Mechanical Keyboard', quantity: 1, price: 159.99 },
        ],
        total: 159.99,
        shippingAddress: '123 Main St, San Francisco, CA 94105',
        trackingNumber: null,
        estimatedDelivery: new Date('2024-12-28'),
      },
    }),
    prisma.order.create({
      data: {
        userId: 'user_demo',
        orderNumber: 'ORD-2024-004',
        status: 'pending',
        items: [
          { name: 'Monitor 27"', quantity: 1, price: 399.99 },
          { name: 'Monitor Arm', quantity: 1, price: 89.99 },
        ],
        total: 489.98,
        shippingAddress: '123 Main St, San Francisco, CA 94105',
        trackingNumber: null,
        estimatedDelivery: null,
      },
    }),
    // John's orders
    prisma.order.create({
      data: {
        userId: 'user_john',
        orderNumber: 'ORD-2024-005',
        status: 'cancelled',
        items: [
          { name: 'Gaming Mouse', quantity: 1, price: 79.99 },
        ],
        total: 79.99,
        shippingAddress: '456 Oak Ave, New York, NY 10001',
        trackingNumber: null,
        estimatedDelivery: null,
      },
    }),
  ]);

  console.log(`✅ Created ${orders.length} orders`);

  // Create payments
  const payments = await Promise.all([
    prisma.payment.create({
      data: {
        userId: 'user_demo',
        orderId: orders[0].id,
        invoiceNumber: 'INV-2024-001',
        amount: 199.97,
        status: 'completed',
        method: 'credit_card',
      },
    }),
    prisma.payment.create({
      data: {
        userId: 'user_demo',
        orderId: orders[1].id,
        invoiceNumber: 'INV-2024-002',
        amount: 139.98,
        status: 'completed',
        method: 'paypal',
      },
    }),
    prisma.payment.create({
      data: {
        userId: 'user_demo',
        orderId: orders[2].id,
        invoiceNumber: 'INV-2024-003',
        amount: 159.99,
        status: 'pending',
        method: 'credit_card',
      },
    }),
    prisma.payment.create({
      data: {
        userId: 'user_demo',
        orderId: null,
        invoiceNumber: 'INV-2024-SUB-001',
        amount: 29.99,
        status: 'completed',
        method: 'credit_card',
      },
    }),
    prisma.payment.create({
      data: {
        userId: 'user_john',
        orderId: orders[4].id,
        invoiceNumber: 'INV-2024-004',
        amount: 79.99,
        status: 'refunded',
        method: 'credit_card',
        refundAmount: 79.99,
        refundReason: 'Order cancelled by customer',
      },
    }),
    prisma.payment.create({
      data: {
        userId: 'user_demo',
        orderId: null,
        invoiceNumber: 'INV-2024-005',
        amount: 49.99,
        status: 'partially_refunded',
        method: 'credit_card',
        refundAmount: 25.00,
        refundReason: 'Partial refund for service issue',
      },
    }),
  ]);

  console.log(`✅ Created ${payments.length} payments`);

  // Create subscriptions
  const subscriptions = await Promise.all([
    prisma.subscription.create({
      data: {
        userId: 'user_demo',
        plan: 'Pro',
        status: 'active',
        currentPeriodStart: new Date('2024-12-01'),
        currentPeriodEnd: new Date('2025-01-01'),
        cancelAtPeriodEnd: false,
      },
    }),
    prisma.subscription.create({
      data: {
        userId: 'user_john',
        plan: 'Basic',
        status: 'cancelled',
        currentPeriodStart: new Date('2024-11-01'),
        currentPeriodEnd: new Date('2024-12-01'),
        cancelAtPeriodEnd: true,
      },
    }),
    prisma.subscription.create({
      data: {
        userId: 'user_jane',
        plan: 'Enterprise',
        status: 'active',
        currentPeriodStart: new Date('2024-12-15'),
        currentPeriodEnd: new Date('2025-01-15'),
        cancelAtPeriodEnd: false,
      },
    }),
  ]);

  console.log(`✅ Created ${subscriptions.length} subscriptions`);

  // Create FAQs
  const faqs = await Promise.all([
    // General Support
    prisma.fAQ.create({
      data: {
        question: 'How do I reset my password?',
        answer: 'To reset your password, click on "Forgot Password" on the login page. Enter your email address, and we\'ll send you a link to create a new password. The link expires in 24 hours.',
        category: 'account',
        keywords: ['password', 'reset', 'forgot', 'login', 'access'],
      },
    }),
    prisma.fAQ.create({
      data: {
        question: 'How do I update my account information?',
        answer: 'You can update your account information by going to Settings > Account > Personal Information. From there, you can edit your name, email, phone number, and other details.',
        category: 'account',
        keywords: ['account', 'update', 'edit', 'profile', 'information', 'settings'],
      },
    }),
    prisma.fAQ.create({
      data: {
        question: 'How do I contact customer support?',
        answer: 'You can reach our customer support team through this chat, by email at support@example.com, or by phone at 1-800-EXAMPLE (Mon-Fri, 9AM-6PM EST).',
        category: 'support',
        keywords: ['contact', 'support', 'help', 'customer service', 'phone', 'email'],
      },
    }),
    // Order FAQs
    prisma.fAQ.create({
      data: {
        question: 'How do I track my order?',
        answer: 'Once your order ships, you\'ll receive an email with a tracking number. You can also track your order by going to Orders > Order History and clicking on the specific order.',
        category: 'orders',
        keywords: ['track', 'order', 'shipping', 'delivery', 'status', 'tracking number'],
      },
    }),
    prisma.fAQ.create({
      data: {
        question: 'Can I cancel my order?',
        answer: 'You can cancel your order if it hasn\'t shipped yet. Go to Orders > Order History, find your order, and click "Cancel Order". If it\'s already shipped, you\'ll need to wait for delivery and then initiate a return.',
        category: 'orders',
        keywords: ['cancel', 'order', 'cancellation', 'stop'],
      },
    }),
    prisma.fAQ.create({
      data: {
        question: 'How do I return an item?',
        answer: 'To return an item, go to Orders > Order History, select the order, and click "Return Items". Follow the instructions to print a return label. Items must be returned within 30 days in original condition.',
        category: 'orders',
        keywords: ['return', 'refund', 'exchange', 'send back'],
      },
    }),
    // Billing FAQs
    prisma.fAQ.create({
      data: {
        question: 'How do I view my invoices?',
        answer: 'You can view all your invoices by going to Billing > Invoice History. From there, you can download PDF copies of any invoice.',
        category: 'billing',
        keywords: ['invoice', 'bill', 'receipt', 'payment history'],
      },
    }),
    prisma.fAQ.create({
      data: {
        question: 'How do I request a refund?',
        answer: 'To request a refund, go to Billing > Request Refund or contact our support team. Refunds are typically processed within 5-7 business days and will be credited to your original payment method.',
        category: 'billing',
        keywords: ['refund', 'money back', 'reimbursement', 'credit'],
      },
    }),
    prisma.fAQ.create({
      data: {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards (Visa, MasterCard, American Express, Discover), PayPal, Apple Pay, and Google Pay. For enterprise customers, we also offer invoice billing.',
        category: 'billing',
        keywords: ['payment', 'credit card', 'paypal', 'pay', 'methods'],
      },
    }),
    prisma.fAQ.create({
      data: {
        question: 'How do I cancel my subscription?',
        answer: 'To cancel your subscription, go to Settings > Subscription > Cancel Subscription. Your access will continue until the end of your current billing period. You can reactivate anytime.',
        category: 'billing',
        keywords: ['cancel', 'subscription', 'unsubscribe', 'stop', 'membership'],
      },
    }),
  ]);

  console.log(`✅ Created ${faqs.length} FAQs`);

  // Create sample conversations
  const conversation = await prisma.conversation.create({
    data: {
      userId: 'user_demo',
      title: 'Order inquiry',
      summary: 'User asked about order status',
      messages: {
        create: [
          {
            role: 'user',
            content: 'Hi, I want to check on my recent order',
          },
          {
            role: 'assistant',
            content: 'Hello! I\'d be happy to help you check on your order. I can see you have a few recent orders. Could you please provide the order number, or would you like me to show you all your recent orders?',
            agentType: 'order',
          },
          {
            role: 'user',
            content: 'Show me all my orders',
          },
          {
            role: 'assistant',
            content: 'Here are your recent orders:\n\n1. **ORD-2024-001** - Delivered ✅\n   - Wireless Headphones, Phone Case (x2)\n   - Total: $199.97\n\n2. **ORD-2024-002** - Shipped 📦\n   - Laptop Stand, USB-C Hub\n   - Total: $139.98\n   - Tracking: 1Z999AA10123456785\n\n3. **ORD-2024-003** - Processing ⏳\n   - Mechanical Keyboard\n   - Total: $159.99\n\n4. **ORD-2024-004** - Pending 🕐\n   - Monitor 27", Monitor Arm\n   - Total: $489.98\n\nWould you like more details about any of these orders?',
            agentType: 'order',
            toolCalls: [{ tool: 'getUserOrders', args: { userId: 'user_demo' } }],
          },
        ],
      },
    },
  });

  console.log(`✅ Created sample conversation`);

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Orders: ${orders.length}`);
  console.log(`   - Payments: ${payments.length}`);
  console.log(`   - Subscriptions: ${subscriptions.length}`);
  console.log(`   - FAQs: ${faqs.length}`);
  console.log(`   - Conversations: 1`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
