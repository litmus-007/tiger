import React, { useRef, useEffect } from 'react';
import { Bot, Sparkles, AlertCircle, X } from 'lucide-react';
import { useChat } from './hooks/useChat';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { TypingIndicator } from './components/TypingIndicator';
import { Sidebar } from './components/Sidebar';
import { AgentInfo } from './components/AgentInfo';

function App() {
  const {
    messages,
    conversationId,
    isLoading,
    isTyping,
    thinkingMessage,
    error,
    sendMessage,
    loadConversation,
    newConversation,
    clearError,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const hasMessages = messages.length > 0;

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        currentConversationId={conversationId}
        onSelectConversation={loadConversation}
        onNewConversation={newConversation}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-gray-900">AI Support</h1>
                <p className="text-sm text-gray-500">Powered by multi-agent system</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Online
              </span>
            </div>
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="flex-1 text-sm text-red-700">{error}</p>
            <button
              onClick={clearError}
              className="p-1 hover:bg-red-100 rounded transition-colors"
            >
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto">
          {!hasMessages ? (
            /* Welcome screen */
            <div className="h-full flex flex-col items-center justify-center p-6">
              <div className="max-w-2xl w-full space-y-8">
                {/* Welcome message */}
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 mb-4">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    How can I help you today?
                  </h2>
                  <p className="text-gray-500 max-w-md mx-auto">
                    I'm your AI support assistant. Ask me about orders, billing,
                    or general support questions.
                  </p>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      title: 'Track Order',
                      description: 'Check order status and delivery',
                      prompt: 'Show me my recent orders',
                      icon: '📦',
                    },
                    {
                      title: 'Billing Help',
                      description: 'Invoices, refunds, subscriptions',
                      prompt: 'I need help with my billing',
                      icon: '💳',
                    },
                    {
                      title: 'General Support',
                      description: 'FAQs and troubleshooting',
                      prompt: 'How do I reset my password?',
                      icon: '💬',
                    },
                  ].map((action) => (
                    <button
                      key={action.title}
                      onClick={() => sendMessage(action.prompt)}
                      disabled={isLoading}
                      className="p-4 bg-white border border-gray-200 rounded-xl hover:border-brand-300 hover:shadow-md transition-all text-left group"
                    >
                      <span className="text-2xl mb-2 block">{action.icon}</span>
                      <h3 className="font-medium text-gray-900 group-hover:text-brand-600 transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {action.description}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Agent info */}
                <AgentInfo />
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="max-w-3xl mx-auto p-6 space-y-6">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {/* Typing indicator */}
              {isTyping && <TypingIndicator message={thinkingMessage} />}

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="max-w-3xl mx-auto">
            <ChatInput
              onSend={sendMessage}
              isLoading={isLoading}
              placeholder={
                hasMessages
                  ? 'Continue the conversation...'
                  : 'Ask me anything about your orders, billing, or support...'
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
            /* Welcome screen */
            <div className="h-full flex flex-col items-center justify-center p-8">
              <div className="max-w-2xl w-full space-y-8">
                {/* Hero */}
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    How can I help you today?
                  </h2>
                  <p className="text-gray-500 max-w-md mx-auto">
                    I'm your AI assistant with specialized agents for support, orders, and billing.
                    Ask me anything!
                  </p>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      title: 'Check Order Status',
                      description: 'Track your orders and deliveries',
                      prompt: "What's the status of my recent orders?",
                    },
                    {
                      title: 'Billing Help',
                      description: 'Invoices, refunds & subscriptions',
                      prompt: 'Can you show me my recent invoices?',
                    },
                    {
                      title: 'General Support',
                      description: 'FAQs and troubleshooting',
                      prompt: 'How do I reset my password?',
                    },
                  ].map((action) => (
                    <button
                      key={action.title}
                      onClick={() => sendMessage(action.prompt)}
                      className="p-4 bg-white rounded-xl border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all text-left group"
                    >
                      <div className="font-medium text-gray-900 group-hover:text-brand-600 transition-colors">
                        {action.title}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {action.description}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Agent info */}
                <AgentInfo />
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="max-w-3xl mx-auto p-6 space-y-6">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              
              {/* Typing indicator */}
              {isTyping && <TypingIndicator message={thinkingMessage} />}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="p-6 bg-gradient-to-t from-gray-50 to-transparent">
          <div className="max-w-3xl mx-auto">
            <ChatInput
              onSend={sendMessage}
              isLoading={isLoading}
              placeholder={
                hasMessages
                  ? 'Continue the conversation...'
                  : 'Ask me about orders, billing, or anything else...'
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
