import { useState, useCallback, useRef, useEffect } from 'react';
import { api, StreamEvent, RoutingData, ToolCallData, TextDeltaData, DoneData, ThinkingData } from '../lib/api';
import type { Message, AgentType } from '@ai-support/shared';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentType?: AgentType;
  toolCalls?: Array<{ tool: string; args: Record<string, unknown>; result?: unknown }>;
  isStreaming?: boolean;
  routing?: {
    agent: AgentType;
    agentName: string;
    reason: string;
  };
}

export interface ChatState {
  messages: ChatMessage[];
  conversationId: string | null;
  isLoading: boolean;
  isTyping: boolean;
  currentAgent: AgentType | null;
  thinkingMessage: string | null;
  error: string | null;
}

const THINKING_MESSAGES = [
  'Analyzing your request...',
  'Thinking...',
  'Processing...',
  'Looking into this...',
  'Searching for information...',
  'Connecting to the right agent...',
];

export function useChat(userId: string = 'user_demo') {
  const [state, setState] = useState<ChatState>({
    messages: [],
    conversationId: null,
    isLoading: false,
    isTyping: false,
    currentAgent: null,
    thinkingMessage: null,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Random thinking message
  const getRandomThinkingMessage = () => {
    return THINKING_MESSAGES[Math.floor(Math.random() * THINKING_MESSAGES.length)];
  };

  // Send a message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || state.isLoading) return;

      // Add user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: content.trim(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        isLoading: true,
        isTyping: true,
        thinkingMessage: getRandomThinkingMessage(),
        error: null,
      }));

      // Create streaming assistant message
      const assistantMessageId = `assistant-${Date.now()}`;
      let assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        toolCalls: [],
      };

      try {
        for await (const event of api.streamMessage(
          content.trim(),
          state.conversationId || undefined,
          userId
        )) {
          switch (event.type) {
            case 'thinking': {
              const data = event.data as ThinkingData;
              setState((prev) => ({
                ...prev,
                thinkingMessage: data.message,
                conversationId: data.conversationId || prev.conversationId,
              }));
              break;
            }

            case 'routing': {
              const data = event.data as RoutingData;
              assistantMessage = {
                ...assistantMessage,
                agentType: data.agent,
                routing: {
                  agent: data.agent,
                  agentName: data.agentName,
                  reason: data.reason,
                },
              };
              setState((prev) => ({
                ...prev,
                currentAgent: data.agent,
                thinkingMessage: `${data.agentName} is handling your request...`,
              }));
              break;
            }

            case 'tool_call': {
              const data = event.data as ToolCallData;
              assistantMessage = {
                ...assistantMessage,
                toolCalls: [
                  ...(assistantMessage.toolCalls || []),
                  { tool: data.tool, args: data.args },
                ],
              };
              setState((prev) => ({
                ...prev,
                thinkingMessage: `Using ${data.tool}...`,
              }));
              break;
            }

            case 'tool_result': {
              // Update the last tool call with its result
              const toolCalls = assistantMessage.toolCalls || [];
              if (toolCalls.length > 0) {
                const data = event.data as { tool: string; result: unknown };
                const lastCall = toolCalls.find((tc) => tc.tool === data.tool && !tc.result);
                if (lastCall) {
                  lastCall.result = data.result;
                }
              }
              break;
            }

            case 'text_delta': {
              const data = event.data as TextDeltaData;
              assistantMessage = {
                ...assistantMessage,
                content: assistantMessage.content + data.delta,
              };

              // Update messages with streaming content
              setState((prev) => {
                const existingIndex = prev.messages.findIndex(
                  (m) => m.id === assistantMessageId
                );
                const newMessages =
                  existingIndex >= 0
                    ? prev.messages.map((m) =>
                        m.id === assistantMessageId ? assistantMessage : m
                      )
                    : [...prev.messages, assistantMessage];

                return {
                  ...prev,
                  messages: newMessages,
                  isTyping: false,
                  thinkingMessage: null,
                };
              });
              break;
            }

            case 'done': {
              const data = event.data as DoneData;
              assistantMessage = {
                ...assistantMessage,
                content: data.fullText || assistantMessage.content,
                agentType: data.agentType,
                isStreaming: false,
              };

              setState((prev) => {
                const existingIndex = prev.messages.findIndex(
                  (m) => m.id === assistantMessageId
                );
                const newMessages =
                  existingIndex >= 0
                    ? prev.messages.map((m) =>
                        m.id === assistantMessageId ? assistantMessage : m
                      )
                    : [...prev.messages, assistantMessage];

                return {
                  ...prev,
                  messages: newMessages,
                  conversationId: data.conversationId,
                  isLoading: false,
                  isTyping: false,
                  thinkingMessage: null,
                };
              });
              break;
            }

            case 'error': {
              const data = event.data as { message: string };
              setState((prev) => ({
                ...prev,
                isLoading: false,
                isTyping: false,
                thinkingMessage: null,
                error: data.message,
              }));
              break;
            }
          }
        }
      } catch (error) {
        console.error('Chat error:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isTyping: false,
          thinkingMessage: null,
          error: error instanceof Error ? error.message : 'An error occurred',
        }));
      }
    },
    [state.conversationId, state.isLoading, userId]
  );

  // Load conversation
  const loadConversation = useCallback(async (conversationId: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = await api.getConversation(conversationId);
      const messages: ChatMessage[] = data.messages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        agentType: m.agentType as AgentType | undefined,
        toolCalls: m.toolCalls as ChatMessage['toolCalls'],
      }));

      setState((prev) => ({
        ...prev,
        messages,
        conversationId,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load conversation',
      }));
    }
  }, []);

  // Start new conversation
  const newConversation = useCallback(() => {
    setState({
      messages: [],
      conversationId: null,
      isLoading: false,
      isTyping: false,
      currentAgent: null,
      thinkingMessage: null,
      error: null,
    });
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    sendMessage,
    loadConversation,
    newConversation,
    clearError,
  };
}
