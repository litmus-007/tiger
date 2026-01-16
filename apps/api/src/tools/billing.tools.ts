import { tool } from 'ai';
import { z } from 'zod';
import { db } from '../db/client.js';

/**
 * Billing Agent Tools
 * These tools help the billing agent handle payment issues, refunds, invoices, and subscription queries
 */

export const getInvoiceDetails = tool({
  description: 'Retrieve detailed information about a specific invoice.',
  parameters: z.object({
    invoiceNumber: z.string().describe('The invoice number (e.g., INV-2024-001)'),
  }),
  execute: async ({ invoiceNumber }) => {
    const payment = await db.payment.findUnique({
      where: { invoiceNumber },
      include: {
        user: { select: { name: true, email: true } },
        order: { select: { orderNumber: true, items: true } },
      },
    });

    if (!payment) {
      return { found: false, message: `No invoice found with number ${invoiceNumber}` };
    }

    return {
      found: true,
      invoice: {
        invoiceNumber: payment.invoiceNumber,
        amount: payment.amount,
        status: payment.status,
        paymentMethod: payment.method,
        createdAt: payment.createdAt,
        refundAmount: payment.refundAmount,
        refundReason: payment.refundReason,
        customerName: payment.user.name,
        customerEmail: payment.user.email,
        relatedOrder: payment.order?.orderNumber || null,
        orderItems: payment.order?.items || null,
      },
    };
  },
});

export const getUserPayments = tool({
  description: 'Get all payments and invoices for a specific user.',
  parameters: z.object({
    userId: z.string().describe('The user ID to retrieve payments for'),
    status: z.enum(['pending', 'completed', 'failed', 'refunded', 'partially_refunded']).optional().describe('Optional filter by payment status'),
    limit: z.number().optional().default(10).describe('Maximum number of payments to retrieve'),
  }),
  execute: async ({ userId, status, limit }) => {
    const payments = await db.payment.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        order: { select: { orderNumber: true } },
      },
    });

    if (payments.length === 0) {
      return { found: false, message: 'No payments found for this user' };
    }

    const totalSpent = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalRefunded = payments
      .reduce((sum, p) => sum + (p.refundAmount || 0), 0);

    return {
      found: true,
      count: payments.length,
      summary: {
        totalSpent,
        totalRefunded,
        pendingPayments: payments.filter(p => p.status === 'pending').length,
      },
      payments: payments.map(payment => ({
        invoiceNumber: payment.invoiceNumber,
        amount: payment.amount,
        status: payment.status,
        method: payment.method,
        createdAt: payment.createdAt,
        relatedOrder: payment.order?.orderNumber || null,
        refundAmount: payment.refundAmount,
      })),
    };
  },
});

export const checkRefundStatus = tool({
  description: 'Check the refund status for a specific invoice or payment.',
  parameters: z.object({
    invoiceNumber: z.string().describe('The invoice number to check refund status for'),
  }),
  execute: async ({ invoiceNumber }) => {
    const payment = await db.payment.findUnique({
      where: { invoiceNumber },
    });

    if (!payment) {
      return { found: false, message: `No invoice found with number ${invoiceNumber}` };
    }

    const hasRefund = payment.status === 'refunded' || payment.status === 'partially_refunded';

    return {
      found: true,
      refundStatus: {
        invoiceNumber: payment.invoiceNumber,
        originalAmount: payment.amount,
        paymentStatus: payment.status,
        hasRefund,
        refundAmount: payment.refundAmount,
        refundReason: payment.refundReason,
        remainingBalance: hasRefund ? payment.amount - (payment.refundAmount || 0) : null,
        refundEligible: payment.status === 'completed',
        message: hasRefund 
          ? `A refund of $${payment.refundAmount?.toFixed(2)} has been processed. ${payment.status === 'partially_refunded' ? `Remaining balance: $${(payment.amount - (payment.refundAmount || 0)).toFixed(2)}` : 'Full refund completed.'}`
          : payment.status === 'completed'
            ? 'This payment is eligible for a refund. Would you like to initiate a refund request?'
            : `This payment cannot be refunded because it is currently ${payment.status}.`,
      },
    };
  },
});

export const requestRefund = tool({
  description: 'Initiate a refund request for a completed payment. Returns information about the refund process.',
  parameters: z.object({
    invoiceNumber: z.string().describe('The invoice number to refund'),
    amount: z.number().optional().describe('Partial refund amount. If not specified, full refund is requested.'),
    reason: z.string().describe('Reason for the refund request'),
  }),
  execute: async ({ invoiceNumber, amount, reason }) => {
    const payment = await db.payment.findUnique({
      where: { invoiceNumber },
    });

    if (!payment) {
      return { success: false, message: `No invoice found with number ${invoiceNumber}` };
    }

    if (payment.status !== 'completed') {
      return { 
        success: false, 
        message: `Cannot refund invoice ${invoiceNumber} - payment status is ${payment.status}.`,
        currentStatus: payment.status,
      };
    }

    const refundAmount = amount || payment.amount;
    
    if (refundAmount > payment.amount) {
      return {
        success: false,
        message: `Refund amount ($${refundAmount.toFixed(2)}) cannot exceed the original payment amount ($${payment.amount.toFixed(2)}).`,
      };
    }

    // Simulate refund request (in production, this would initiate actual refund)
    return {
      success: true,
      refundRequest: {
        invoiceNumber: payment.invoiceNumber,
        originalAmount: payment.amount,
        refundAmount,
        isPartialRefund: refundAmount < payment.amount,
        reason,
        estimatedProcessingTime: '5-7 business days',
        refundMethod: `Original payment method (${payment.method})`,
        referenceNumber: `REF-${Date.now()}`,
        message: `Refund of $${refundAmount.toFixed(2)} has been initiated. You will receive a confirmation email shortly.`,
      },
    };
  },
});

export const getSubscription = tool({
  description: 'Get subscription details for a user including plan, status, and billing cycle.',
  parameters: z.object({
    userId: z.string().describe('The user ID to retrieve subscription for'),
  }),
  execute: async ({ userId }) => {
    const subscriptions = await db.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    if (subscriptions.length === 0) {
      return { found: false, message: 'No subscriptions found for this user' };
    }

    const activeSubscription = subscriptions.find(s => s.status === 'active');
    
    return {
      found: true,
      hasActiveSubscription: !!activeSubscription,
      subscriptions: subscriptions.map(sub => ({
        plan: sub.plan,
        status: sub.status,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        daysRemaining: sub.status === 'active' 
          ? Math.ceil((new Date(sub.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : 0,
        createdAt: sub.createdAt,
      })),
      activeSubscription: activeSubscription ? {
        plan: activeSubscription.plan,
        status: activeSubscription.status,
        renewalDate: activeSubscription.currentPeriodEnd,
        cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd,
      } : null,
    };
  },
});

export const cancelSubscription = tool({
  description: 'Cancel an active subscription. The subscription will remain active until the end of the current billing period.',
  parameters: z.object({
    userId: z.string().describe('The user ID to cancel subscription for'),
    reason: z.string().optional().describe('Optional reason for cancellation'),
  }),
  execute: async ({ userId, reason }) => {
    const subscription = await db.subscription.findFirst({
      where: { 
        userId,
        status: 'active',
      },
    });

    if (!subscription) {
      return { 
        success: false, 
        message: 'No active subscription found for this user.',
      };
    }

    if (subscription.cancelAtPeriodEnd) {
      return {
        success: false,
        message: 'This subscription is already scheduled for cancellation at the end of the current billing period.',
        cancellationDate: subscription.currentPeriodEnd,
      };
    }

    // Simulate cancellation (in production, this would update the database)
    return {
      success: true,
      cancellation: {
        plan: subscription.plan,
        effectiveDate: subscription.currentPeriodEnd,
        message: `Your ${subscription.plan} subscription has been scheduled for cancellation. You will continue to have access until ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}.`,
        canReactivate: true,
        reason: reason || 'Customer requested cancellation',
      },
    };
  },
});

export const billingTools = {
  getInvoiceDetails,
  getUserPayments,
  checkRefundStatus,
  requestRefund,
  getSubscription,
  cancelSubscription,
};
