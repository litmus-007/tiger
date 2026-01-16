# AI Support System

A fullstack AI-powered customer support system with a multi-agent architecture. Features a router agent that analyzes incoming queries and delegates to specialized sub-agents, each with access to relevant tools.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│                    Vite + TypeScript + Tailwind                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │ Hono RPC (Type-safe)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Hono.js)                          │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │ Controllers │───▶│  Services   │───▶│   Agents    │        │
│  └─────────────┘    └─────────────┘    └──────┬──────┘        │
│                                               │                 │
│                                               ▼                 │
│                                    ┌─────────────────┐         │
│                                    │  Router Agent   │         │
│                                    └────────┬────────┘         │
│                           ┌─────────────────┼─────────────────┐│
│                           ▼                 ▼                 ▼││
│                    ┌───────────┐     ┌───────────┐     ┌─────────┐│
│                    │  Support  │     │   Order   │     │ Billing ││
│                    │   Agent   │     │   Agent   │     │  Agent  ││
│                    └─────┬─────┘     └─────┬─────┘     └────┬────┘│
│                          │                 │                 │    │
│                    ┌─────┴─────┐     ┌─────┴─────┐     ┌────┴────┐│
│                    │   Tools   │     │   Tools   │     │  Tools  ││
│                    └───────────┘     └───────────┘     └─────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PostgreSQL + Prisma                        │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Features

### Multi-Agent System
- **Router Agent**: Analyzes queries and delegates to specialized sub-agents
- **Support Agent**: Handles FAQs, troubleshooting, account questions
- **Order Agent**: Manages order status, tracking, modifications, cancellations
- **Billing Agent**: Handles payments, refunds, invoices, subscriptions

### Technical Features
- ✅ Streaming responses (Server-Sent Events)
- ✅ Real-time typing indicators
- ✅ Tool usage visualization
- ✅ Conversation persistence
- ✅ Rate limiting
- ✅ Error handling middleware
- ✅ Type-safe API (Hono RPC)
- ✅ Monorepo with Turborepo

## 📁 Project Structure

```
ai-support-system/
├── apps/
│   ├── api/                    # Backend (Hono.js)
│   │   ├── src/
│   │   │   ├── agents/         # AI Agents
│   │   │   │   ├── base.agent.ts
│   │   │   │   ├── router.agent.ts
│   │   │   │   ├── support.agent.ts
│   │   │   │   ├── order.agent.ts
│   │   │   │   └── billing.agent.ts
│   │   │   ├── controllers/    # Request handlers
│   │   │   ├── services/       # Business logic
│   │   │   ├── tools/          # Agent tools
│   │   │   ├── middleware/     # Error & rate limiting
│   │   │   ├── routes/         # API routes
│   │   │   └── db/             # Database client & seed
│   │   └── prisma/             # Database schema
│   │
│   └── web/                    # Frontend (React + Vite)
│       └── src/
│           ├── components/     # UI components
│           ├── hooks/          # Custom hooks
│           └── lib/            # API client
│
├── packages/
│   └── shared/                 # Shared types & schemas
│
├── turbo.json                  # Turborepo config
└── package.json                # Root package.json
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Backend | Hono.js, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| AI | Vercel AI SDK, OpenAI GPT-4o-mini |
| Monorepo | Turborepo, npm workspaces |
| Type Safety | Zod, Hono RPC |

## 📡 API Routes

```
/api
├── /chat
│   ├── POST /messages              # Send message (streaming)
│   ├── POST /messages/sync         # Send message (non-streaming)
│   ├── GET  /conversations/:id     # Get conversation with messages
│   ├── GET  /conversations         # List user conversations
│   └── DELETE /conversations/:id   # Delete conversation
│
├── /agents
│   ├── GET /                       # List available agents
│   └── GET /:type/capabilities     # Get agent capabilities
│
└── /health                         # Health check
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- OpenAI API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ai-support-system.git
   cd ai-support-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy example env file
   cp apps/api/.env.example apps/api/.env
   
   # Edit with your values
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_support"
   OPENAI_API_KEY="sk-your-api-key-here"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   
   # Seed with sample data
   npm run db:seed
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

   This starts:
   - API server at http://localhost:3001
   - Frontend at http://localhost:5173

## 🎮 Usage

### Demo User

The seed data creates a demo user (`user_demo`) with:
- 4 sample orders (various statuses)
- 6 payments/invoices
- 1 active subscription
- Sample conversation history

### Example Queries

Try these queries to see different agents in action:

**Order Agent:**
- "What are my recent orders?"
- "Track order ORD-2024-002"
- "Can I cancel my pending order?"

**Billing Agent:**
- "Show me my invoices"
- "I need a refund for invoice INV-2024-001"
- "What's my subscription status?"

**Support Agent:**
- "How do I reset my password?"
- "What payment methods do you accept?"
- "How do I contact support?"

## 🔧 Agent Tools

### Support Agent Tools
| Tool | Description |
|------|-------------|
| `searchFAQs` | Search FAQ database for answers |
| `getConversationHistory` | Get past conversation context |
| `getUserInfo` | Get user profile information |

### Order Agent Tools
| Tool | Description |
|------|-------------|
| `getOrderByNumber` | Get specific order details |
| `getUserOrders` | List all user orders |
| `checkDeliveryStatus` | Get delivery/tracking info |
| `cancelOrder` | Cancel an order |
| `modifyOrder` | Check modification options |

### Billing Agent Tools
| Tool | Description |
|------|-------------|
| `getInvoiceDetails` | Get invoice information |
| `getUserPayments` | List payment history |
| `checkRefundStatus` | Check refund status |
| `requestRefund` | Initiate refund request |
| `getSubscription` | Get subscription details |
| `cancelSubscription` | Cancel subscription |

## 🏆 Bonus Features Implemented

- ✅ **Hono RPC + Monorepo Setup** - Full type safety between frontend and backend
- ✅ **Rate Limiting** - Configurable rate limits for API endpoints
- ✅ **Thinking/Reasoning Display** - Shows agent routing and tool usage
- ✅ **Streaming Responses** - Real-time response streaming with SSE

## 📝 Design Decisions

### Why Controller-Service Pattern?
- Clear separation of concerns
- Controllers handle HTTP concerns
- Services contain business logic
- Easier testing and maintenance

### Why Multi-Agent Architecture?
- Specialized agents provide better responses
- Tools are scoped to relevant domains
- Router enables intelligent delegation
- Fallback handling for edge cases

### Why Streaming?
- Better user experience
- Real-time feedback
- Reduced perceived latency
- Progressive rendering

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run specific package tests
npm run test --filter=@ai-support/api
```

## 📦 Building for Production

```bash
# Build all packages
npm run build

# Start production server
cd apps/api && npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

---

Built with ❤️ for the Fullstack Engineering Assessment
