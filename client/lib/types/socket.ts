import type { Message, Suggestion } from '../slices/chatSlice';

// Socket event types
export interface SocketEvents {
  // Client -> Server
  'autocomplete-request': { query: string; trigger: '@' | '#' };
  'load-messages': { conversationId: string };
  'send-message': { 
    conversationId: string;
    type: 'user' | 'bot';
    content: string;
    segments: Array<{ type: 'text' | 'hashtag' | 'mention'; content: string; id?: string; name?: string }>;
    currentText: string;
    timestamp: string;
  };

  // Server -> Client
  'autocomplete-response': { suggestions: Suggestion[]; query: string; trigger: '@' | '#' };
  'autocomplete-error': { error: string };
  'messages-loaded': { conversationId: string; messages: Message[] };
  'messages-error': { error: string };
  'message-sent': { success: boolean; message: Message };
  'message-error': { error: string };
  'new-message': Message & { conversationId?: string };
  'bot-typing': { conversationId: string; isTyping: boolean };
  'conversation-updated': {
    _id: string;
    title: string;
    updatedAt: string;
  };
  'conversation-deleted': { conversationId: string };
}

export type SocketEventName = keyof SocketEvents;
export type SocketEventData<T extends SocketEventName> = SocketEvents[T];

