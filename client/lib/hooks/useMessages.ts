import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks';
import { setMessages, addMessage, setBotTyping } from '../slices/chatSlice';
import { useSocket, useSocketEmit } from './useSocket';
import { getSocket } from '../socket';
import type { Message } from '../slices/chatSlice';

export function useMessages(conversationId: string | null) {
  const dispatch = useAppDispatch();
  const { messages, isBotTyping } = useAppSelector(state => state.chat);
  const [loading, setLoading] = useState(false);
  const emit = useSocketEmit();

  // Load initial messages via socket
  useEffect(() => {
    if (!conversationId) {
      dispatch(setMessages([]));
      return;
    }

    setTimeout(() => {
      setLoading(true);
    }, 0);
    const socket = getSocket();
    
    // Listen for messages loaded response
    const handleMessagesLoaded = (data: { conversationId: string; messages: Message[] }) => {
      if (data.conversationId === conversationId) {
        dispatch(setMessages(data.messages || []));
        setLoading(false);
      }
    };

    const handleMessagesError = () => {
      console.error('Error loading messages');
      setLoading(false);
    };

    socket.on('messages-loaded', handleMessagesLoaded);
    socket.on('messages-error', handleMessagesError);

    // Request messages
    socket.emit('load-messages', { conversationId });

    return () => {
      socket.off('messages-loaded', handleMessagesLoaded);
      socket.off('messages-error', handleMessagesError);
    };
  }, [conversationId, dispatch]);

  // Listen for new messages in real-time
  useSocket('new-message', (data) => {
    if (data.conversationId === conversationId) {
      dispatch(addMessage(data));
    }
  });

  // Listen for bot typing indicator
  useSocket('bot-typing', (data) => {
    if (data.conversationId === conversationId) {
      dispatch(setBotTyping(data.isTyping));
    }
  });

  // Send message via socket
  const sendMessage = (messageData: {
    type: 'user' | 'bot';
    content: string;
    segments: Array<{ type: 'text' | 'hashtag' | 'mention'; content: string; id?: string; name?: string }>;
    currentText: string;
    timestamp: string;
  }) => {
    if (!conversationId) return;
    
    emit('send-message', {
      conversationId,
      type: messageData.type,
      content: messageData.content,
      segments: messageData.segments,
      currentText: messageData.currentText,
      timestamp: messageData.timestamp,
    });
  };

  return { messages, isBotTyping, loading, sendMessage };
}
