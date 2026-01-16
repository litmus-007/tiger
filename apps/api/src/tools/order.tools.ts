import { tool } from 'ai';
import { z } from 'zod';
import { db } from '../db/client.js';

/**
 * Order Agent Tools
 * These tools help the order agent handle order status, tracking, modifications, and cancellations
 */

export const getOrderByNumber = tool({
  description: 'Fetch detailed information about a specific order using its order number.',
  parameters: z.object({
    orderNumber: z.string().describe('The order number (e.g., ORD-2024-001)'),
  }),
  execute: async ({ orderNumber }) => {
    const order = await db.order.findUnique({
      where: { orderNumber },
      include: {
        user: { select: { name: true, email: true } },
        payments: true,
      },
    });

    if (!order) {
      return { found: false, message: `No order found with number ${orderNumber}` };
    }

    return {
      found: true,
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        items: order.items,
        total: order.total,
        shippingAddress: order.shippingAddress,
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        paymentStatus: order.payments[0]?.status || 'unknown',
        customerName: order.user.name,
      },
    };
  },
});

export const getUserOrders = tool({
  description: 'Get all orders for a specific user. Use this to show order history or help identify which order the customer is asking about.',
  parameters: z.object({
    userId: z.string().describe('The user ID to retrieve orders for'),
    status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional().describe('Optional filter by order status'),
    limit: z.number().optional().default(10).describe('Maximum number of orders to retrieve'),
  }),
  execute: async ({ userId, status, limit }) => {
    const orders = await db.order.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        payments: { select: { status: true, amount: true } },
      },
    });

    if (orders.length === 0) {
      return { found: false, message: 'No orders found for this user' };
    }

    return {
      found: true,
      count: orders.length,
      orders: orders.map(order => ({
        orderNumber: order.orderNumber,
        status: order.status,
        items: order.items,
        total: order.total,
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery,
        createdAt: order.createdAt,
        paymentStatus: order.payments[0]?.status || 'unknown',
      })),
    };
  },
});

export const checkDeliveryStatus = tool({
  description: 'Check the delivery status and tracking information for an order.',
  parameters: z.object({
    orderNumber: z.string().describe('The order number to check delivery status for'),
  }),
  execute: async ({ orderNumber }) => {
    const order = await db.order.findUnique({
      where: { orderNumber },
      select: {
        orderNumber: true,
        status: true,
        trackingNumber: true,
        estimatedDelivery: true,
        shippingAddress: true,
        updatedAt: true,
      },
    });

    if (!order) {
      return { found: false, message: `No order found with number ${orderNumber}` };
    }

    // Simulate tracking information based on status
    const trackingSteps = {
      pending: [
        { status: 'Order Placed', completed: true, date: order.updatedAt },
      ],
      processing: [
        { status: 'Order Placed', completed: true, date: order.updatedAt },
        { status: 'Payment Confirmed', completed: true, date: order.updatedAt },
        { status: 'Preparing for Shipment', completed: false, date: null },
      ],
      shipped: [
        { status: 'Order Placed', completed: true, date: order.updatedAt },
        { status: 'Payment Confirmed', completed: true, date: order.updatedAt },
        { status: 'Shipped', completed: true, date: order.updatedAt },
        { status: 'In Transit', completed: true, date: order.updatedAt },
        { status: 'Out for Delivery', completed: false, date: null },
      ],
      delivered: [
        { status: 'Order Placed', completed: true, date: order.updatedAt },
        { status: 'Payment Confirmed', completed: true, date: order.updatedAt },
        { status: 'Shipped', completed: true, date: order.updatedAt },
        { status: 'Delivered', completed: true, date: order.updatedAt },
      ],
      cancelled: [
        { status: 'Order Placed', completed: true, date: order.updatedAt },
        { status: 'Order Cancelled', completed: true, date: order.updatedAt },
      ],
    };

    return {
      found: true,
      delivery: {
        orderNumber: order.orderNumber,
        currentStatus: order.status,
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery,
        shippingAddress: order.shippingAddress,
        trackingSteps: trackingSteps[order.status] || [],
        carrier: order.trackingNumber ? 'UPS' : null,
        trackingUrl: order.trackingNumber 
          ? `https://www.ups.com/track?tracknum=${order.trackingNumber}`
          : null,
      },
    };
  },
});

export const cancelOrder = tool({
  description: 'Cancel an order if it has not been shipped yet. Orders that are already shipped or delivered cannot be cancelled.',
  parameters: z.object({
    orderNumber: z.string().describe('The order number to cancel'),
    reason: z.string().optional().describe('Optional reason for cancellation'),
  }),
  execute: async ({ orderNumber, reason }) => {
    const order = await db.order.findUnique({
      where: { orderNumber },
    });

    if (!order) {
      return { success: false, message: `No order found with number ${orderNumber}` };
    }

    if (order.status === 'shipped' || order.status === 'delivered') {
      return { 
        success: false, 
        message: `Cannot cancel order ${orderNumber} - it has already been ${order.status}. Please initiate a return instead.`,
        currentStatus: order.status,
      };
    }

    if (order.status === 'cancelled') {
      return { 
        success: false, 
        message: `Order ${orderNumber} has already been cancelled.`,
        currentStatus: order.status,
      };
    }

    // Simulate cancellation (in production, this would update the database)
    // For demo purposes, we'll just return success without actually updating
    return {
      success: true,
      message: `Order ${orderNumber} has been successfully cancelled.`,
      orderNumber: order.orderNumber,
      previousStatus: order.status,
      refundAmount: order.total,
      refundMessage: 'A refund will be processed within 5-7 business days.',
      cancellationReason: reason || 'Customer requested cancellation',
    };
  },
});

export const modifyOrder = tool({
  description: 'Check if an order can be modified and provide modification options. Orders can only be modified if they are in pending or processing status.',
  parameters: z.object({
    orderNumber: z.string().describe('The order number to modify'),
  }),
  execute: async ({ orderNumber }) => {
    const order = await db.order.findUnique({
      where: { orderNumber },
    });

    if (!order) {
      return { canModify: false, message: `No order found with number ${orderNumber}` };
    }

    const canModify = order.status === 'pending' || order.status === 'processing';

    return {
      canModify,
      orderNumber: order.orderNumber,
      currentStatus: order.status,
      message: canModify 
        ? 'This order can be modified. Available options: change shipping address, add/remove items, or cancel order.'
        : `This order cannot be modified because it is already ${order.status}. ${order.status === 'shipped' ? 'You can track your delivery or initiate a return after receiving it.' : ''}`,
      availableActions: canModify 
        ? ['change_address', 'modify_items', 'cancel_order']
        : order.status === 'shipped' 
          ? ['track_delivery', 'initiate_return']
          : order.status === 'delivered'
            ? ['initiate_return', 'leave_review']
            : [],
    };
  },
});

export const orderTools = {
  getOrderByNumber,
  getUserOrders,
  checkDeliveryStatus,
  cancelOrder,
  modifyOrder,
};
