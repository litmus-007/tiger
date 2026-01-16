import React from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Bot, Wrench, Package, CreditCard, HelpCircle } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '../hooks/useChat';
import type { AgentType } from '@ai-support/shared';

interface ChatMessageProps {
  message: ChatMessageType;
}

const agentIcons: Record<AgentType, React.ReactNode> = {
  router: <Bot className="w-4 h-4" />,
  support: <HelpCircle className="w-4 h-4" />,
  order: <Package className="w-4 h-4" />,
  billing: <CreditCard className="w-4 h-4" />,
};

const agentColors: Record<AgentType, string> = {
  router: 'bg-gray-100 text-gray-700',
  support: 'bg-emerald-100 text-emerald-700',
  order: 'bg-amber-100 text-amber-700',
  billing: 'bg-violet-100 text-violet-700',
};

const agentNames: Record<AgentType, string> = {
  router: 'Router',
  support: 'Support',
  order: 'Orders',
  billing: 'Billing',
};

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex gap-3 animate-fade-in ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-brand-500 text-white'
            : 'bg-gray-100 text-gray-600'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : message.agentType ? (
          agentIcons[message.agentType]
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      {/* Message content */}
      <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Agent badge */}
        {!isUser && message.agentType && (
          <div className={`agent-badge ${agentColors[message.agentType]}`}>
            {agentIcons[message.agentType]}
            <span>{agentNames[message.agentType]} Agent</span>
          </div>
        )}

        {/* Routing info */}
        {!isUser && message.routing && (
          <div className="text-xs text-gray-500 mb-1">
            Routed to {message.routing.agentName}: {message.routing.reason}
          </div>
        )}

        {/* Tool calls */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.toolCalls.map((tc, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-600"
              >
                <Wrench className="w-3 h-3" />
                <span>{tc.tool}</span>
              </div>
            ))}
          </div>
        )}

        {/* Message bubble */}
        <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <div className="markdown-content">
              <ReactMarkdown>{message.content || '...'}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Streaming indicator */}
        {message.isStreaming && (
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
            <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" />
            <span>Typing...</span>
          </div>
        )}
      </div>
    </div>
  );
}
