'use client';

import { Hash, AtSign } from 'lucide-react';
import type { Message, Segment } from '../lib/slices/chatSlice';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  // Check if message is from bot (reply) or user
  const isBot = message.type === 'bot';
  const senderName = isBot ? 'Bot' : 'You';
  const avatarBg = isBot ? 'bg-blue-500' : 'bg-green-500';
  const messageAlignment = isBot ? 'flex-row-reverse' : 'flex-row';

  // Render message with segments
  const renderMessage = () => {
    const parts: React.ReactElement[] = [];

    // Render segments
    message.segments.forEach((segment: Segment, index: number) => {
      if (segment.type === 'text') {
        parts.push(
          <span key={index} className="text-gray-800">
            {segment.content}
          </span>
        );
      } else if (segment.type === 'hashtag') {
        parts.push(
          <span key={index} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium text-sm mx-0.5">
            <Hash size={12} />
            {segment.content}
          </span>
        );
      } else if (segment.type === 'mention') {
        parts.push(
          <span key={index} className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium text-sm mx-0.5">
            <AtSign size={12} />
            {segment.content}
          </span>
        );
      }
    });

    // Add currentText if present
    if (message.currentText) {
      parts.push(
        <span key="current-text" className="text-gray-800">
          {message.currentText}
        </span>
      );
    }

    // If no segments and no currentText, show content as fallback
    if (parts.length === 0) {
      parts.push(
        <span key="fallback" className="text-gray-800">
          {message.content}
        </span>
      );
    }

    return parts;
  };

  return (
    <div className={`px-4 py-2 hover:bg-gray-50 transition-colors ${isBot ? 'bg-gray-50' : ''}`}>
      <div className={`flex items-start gap-3 ${messageAlignment}`}>
        <div className={`shrink-0 w-10 h-10 rounded-full ${avatarBg} flex items-center justify-center text-white font-medium`}>
          {isBot ? 'B' : 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`flex items-baseline gap-2 mb-1 ${isBot ? 'justify-end' : ''}`}>
            <span className="text-sm font-semibold text-gray-900">{senderName}</span>
            <span className="text-xs text-gray-500">{message.timestamp}</span>
          </div>
          <div className={`text-sm text-gray-800 whitespace-pre-wrap wrap-break-word ${isBot ? 'text-right' : ''}`}>
            {renderMessage()}
          </div>
        </div>
      </div>
    </div>
  );
}

