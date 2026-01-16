import React from 'react';
import { Bot, Sparkles } from 'lucide-react';

interface TypingIndicatorProps {
  message?: string | null;
}

const defaultMessages = [
  'Thinking',
  'Analyzing',
  'Processing',
  'Searching',
];

export function TypingIndicator({ message }: TypingIndicatorProps) {
  const displayMessage = message || defaultMessages[Math.floor(Math.random() * defaultMessages.length)];

  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="chat-bubble chat-bubble-assistant">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-500 animate-pulse" />
          <span className="text-gray-600">{displayMessage}</span>
          <span className="flex gap-1">
            <span className="typing-dot" style={{ animationDelay: '0ms' }} />
            <span className="typing-dot" style={{ animationDelay: '150ms' }} />
            <span className="typing-dot" style={{ animationDelay: '300ms' }} />
          </span>
        </div>
      </div>
    </div>
  );
}
