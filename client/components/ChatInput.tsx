'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { Hash, AtSign, X, Send } from 'lucide-react';
import { useAutocomplete } from '../lib/hooks/useAutocomplete';
import { useMessages } from '../lib/hooks/useMessages';
import type { Suggestion as BackendSuggestion } from '../lib/slices/chatSlice';

interface Segment {
  type: 'text' | 'hashtag' | 'mention';
  content: string;
  id?: string;
  name?: string;
}

// Mapped suggestion types for component
interface HashtagSuggestion {
  id: string;
  tag: string;
}

interface UserSuggestion {
  id: string;
  username: string;
  name: string;
  avatar: string;
}

type ComponentSuggestion = HashtagSuggestion | UserSuggestion;

export default function ChatInput({ conversationId }: { conversationId: string }) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { suggestions: backendSuggestions, isOpen: isSuggestionsOpen, requestSuggestions, close } = useAutocomplete();
  const { sendMessage } = useMessages(conversationId);

  // Extract trigger and query from input
  const { query, triggerType, showSuggestions } = useMemo(() => {
    const words = currentInput.split(' ');
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('#')) {
      const query = lastWord.slice(1);
      return { 
        query,
        triggerType: 'hashtag' as const,
        showSuggestions: isSuggestionsOpen && query.length >= 0
      };
    } else if (lastWord.startsWith('@')) {
      const query = lastWord.slice(1);
      return { 
        query,
        triggerType: 'mention' as const,
        showSuggestions: isSuggestionsOpen && query.length >= 0
      };
    } else {
      return { 
        query: '',
        triggerType: null,
        showSuggestions: false
      };
    }
  }, [currentInput, isSuggestionsOpen]);

  // Map backend suggestions to component format
  const suggestions = useMemo(() => {
    if (!showSuggestions || !backendSuggestions.length) return [];
    
    return backendSuggestions.map((suggestion: BackendSuggestion): ComponentSuggestion => {
      if (suggestion.type === 'hashtag') {
        return {
          id: suggestion.id,
          tag: suggestion.name,
        };
      } else {
        // For users, use name as both name and username (or generate username from name)
        const username = suggestion.name.toLowerCase().replace(/\s+/g, '');
        return {
          id: suggestion.id,
          username,
          name: suggestion.name,
          avatar: suggestion.avatar || '👤',
        };
      }
    });
  }, [backendSuggestions, showSuggestions]);

  // Request suggestions when query or trigger changes
  useEffect(() => {
    if (triggerType && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      requestSuggestions(query, triggerType === 'hashtag' ? '#' : '@', {
            top: rect.bottom + window.scrollY + 5,
            left: rect.left + window.scrollX,
          });
      } else {
        close();
      }
  }, [query, triggerType, requestSuggestions, close]);

  // Reset selected index when input changes (which triggers new suggestions)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentInput(e.target.value);
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        selectSuggestion(suggestions[selectedIndex]);
      } else if (e.key === 'Escape') {
        close();
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else if (e.key === 'Backspace') {
      // If input is empty and we have segments, remove the last segment
      if (currentInput === '' && segments.length > 0) {
        e.preventDefault();
        setSegments(segments.slice(0, -1));
      }
      // If cursor is at the start and input has text starting with @ or #, remove entire tag
      else if ((e.target as HTMLInputElement).selectionStart === 0 && currentInput.length > 0) {
        const firstChar = currentInput[0];
        if (firstChar === '#' || firstChar === '@') {
          e.preventDefault();
          setCurrentInput('');
        }
      }
      // Check if we're deleting into a tag (when typing after a segment)
      else if ((e.target as HTMLInputElement).selectionStart === 0 && segments.length > 0) {
        e.preventDefault();
        setSegments(segments.slice(0, -1));
      }
    }
  };

  const selectSuggestion = (item: ComponentSuggestion) => {
    const words = currentInput.split(' ');
    words.pop();
    
    const textBefore = words.length > 0 ? words.join(' ') + ' ' : '';
    
    if (triggerType === 'hashtag' && 'tag' in item) {
      setSegments([...segments, 
        { type: 'text', content: textBefore },
        { type: 'hashtag', content: item.tag, id: item.id }
      ]);
    } else if (triggerType === 'mention' && 'username' in item) {
      setSegments([...segments,
        { type: 'text', content: textBefore },
        { type: 'mention', content: item.username, id: item.id, name: item.name }
      ]);
    }
    
    setCurrentInput('');
    close();
    inputRef.current?.focus();
  };

  const removeSegment = (index: number) => {
    setSegments(segments.filter((_, i) => i !== index));
  };

  const getFullText = () => {
    let text = '';
    segments.forEach(seg => {
      if (seg.type === 'text') {
        text += seg.content;
      } else if (seg.type === 'hashtag') {
        text += '#' + seg.content + ' ';
      } else if (seg.type === 'mention') {
        text += '@' + seg.content + ' ';
      }
    });
    text += currentInput;
    return text.trim();
  };

  const handleSendMessage = async () => {
    const messageText = getFullText();
    
    if (!messageText) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Send message via backend with new format
    await sendMessage({
      type: 'user',
      content: messageText,
      segments: [...segments],
      currentText: currentInput,
      timestamp
    });

    // Clear input
    setSegments([]);
    setCurrentInput('');
  };

  return (
    <div className="bg-white rounded-b-2xl shadow-lg p-4">
    <div className="relative">
        <div className="min-h-12 p-3 border-2 border-gray-300 rounded-xl focus-within:border-blue-500 transition-colors bg-gray-50 flex items-center gap-2">
          <div className="flex flex-wrap gap-2 items-center flex-1">
            {segments.map((segment, index) => (
              <div key={index}>
                {segment.type === 'text' ? (
                  <span className="text-gray-800">{segment.content}</span>
                ) : segment.type === 'hashtag' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium text-sm">
                    <Hash size={14} />
                    {segment.content}
                    <button
                      onClick={() => removeSegment(index)}
                      className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium text-sm">
                    <AtSign size={14} />
                    {segment.content}
                    <button
                      onClick={() => removeSegment(index)}
                      className="hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </span>
                )}
              </div>
            ))}
            <input
            ref={inputRef}
              type="text"
              value={currentInput}
              onChange={handleInputChange}
            onKeyDown={handleKeyDown}
              placeholder={segments.length === 0 ? "Type a message... use # or @" : ""}
              className="flex-1 min-w-32 outline-none bg-transparent text-gray-800 placeholder-gray-400"
            />
        </div>
        <button
            onClick={handleSendMessage}
            disabled={!getFullText()}
            className="p-2 bg-linear-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
        </button>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute bottom-full mb-2 w-full bg-white rounded-xl shadow-2xl border border-gray-200 max-h-64 overflow-y-auto z-10">
            {triggerType === 'hashtag' && (
              <div className="p-2">
                {suggestions.map((hashtag, index) => {
                  if (!('tag' in hashtag)) return null;
                  return (
                    <div
                      key={hashtag.id}
                      onClick={() => selectSuggestion(hashtag)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        index === selectedIndex
                          ? 'bg-blue-100'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Hash className="text-blue-600" size={20} />
                        <div>
                          <p className="font-semibold text-gray-800">#{hashtag.tag}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {triggerType === 'mention' && (
              <div className="p-2">
                {suggestions.map((user, index) => {
                  if (!('username' in user)) return null;
                  return (
                    <div
                      key={user.id}
                      onClick={() => selectSuggestion(user)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        index === selectedIndex
                          ? 'bg-purple-100'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-2xl">{user.avatar}</span>
                      <div>
                        <p className="font-semibold text-gray-800">{user.name}</p>
                        <p className="text-sm text-gray-500">@{user.username}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      
      <p className="text-xs text-gray-500 mt-2 text-center">
        Use # for hashtags • @ for mentions • Enter to send
      </p>
    </div>
  );
}
