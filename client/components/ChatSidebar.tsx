'use client';

import { useEffect, useState } from 'react';
import { Plus, MessageSquare, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useSocket } from '../lib/hooks/useSocket';
import apiClient from '../lib/api/axios';

interface Conversation {
  _id: string;
  title: string;
  updatedAt: string;
}

export default function ChatSidebar({ 
  currentConversationId, 
  onSelectConversation,
  onNewChat,
  isOpen,
  onToggle,
  refreshTrigger
}: { 
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onToggle: () => void;
  refreshTrigger?: number;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    try {
      const { data } = await apiClient.get('/conversations');
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    // Removed interval polling - fetch only on mount and when needed
  }, []);

  // Refresh conversations when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      fetchConversations();
    }
  }, [refreshTrigger]);

  // Listen for conversation updates (e.g., when title is generated)
  useSocket('conversation-updated', () => {
    fetchConversations();
  });

  // Listen for conversation deletions
  useSocket('conversation-deleted', () => {
    fetchConversations();
  });

  const handleDeleteConversation = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation(); // Prevent triggering the conversation select
    
    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.delete(`/conversations/${conversationId}`);
      // The socket event will trigger a refresh, but we can also refresh immediately
      fetchConversations();
      
      // If the deleted conversation was the current one, navigate away
      if (currentConversationId === conversationId) {
        // Pass empty string to navigate to home
        onSelectConversation('');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Failed to delete conversation. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        bg-white border-r border-gray-200 
        flex flex-col h-screen
        transform transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-16'}
        overflow-hidden shadow-lg lg:shadow-none
      `}>
        {/* Header */}
        <div className={`p-3 border-b border-gray-200 flex items-center gap-2 ${isOpen ? 'min-w-[256px]' : ''}`}>
          {isOpen ? (
            <button
              onClick={onNewChat}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </button>
          ) : (
            <button
              onClick={onNewChat}
              className="w-10 h-10 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center transition-colors"
              title="New Chat"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Conversations List */}
        <div className={`flex-1 overflow-y-auto p-2 ${isOpen ? 'min-w-[256px]' : ''}`}>
          {isOpen && (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                Recent
              </div>
              {loading ? (
                <div className="text-center text-gray-400 py-4 text-sm">Loading...</div>
              ) : conversations.length === 0 ? (
                <div className="text-center text-gray-400 py-4 text-sm">No conversations yet</div>
              ) : (
                <div className="space-y-1">
                  {conversations.map((conv) => (
                    <div
                      key={conv._id}
                      className={`group relative w-full rounded-lg transition-colors ${
                        currentConversationId === conv._id
                          ? 'bg-green-50 border border-green-200'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <button
                        onClick={() => {
                          onSelectConversation(conv._id);
                          if (window.innerWidth < 1024) {
                            onToggle();
                          }
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-2 ${
                          currentConversationId === conv._id
                            ? 'text-green-900'
                            : 'text-gray-700'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{conv.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{formatDate(conv.updatedAt)}</div>
                        </div>
                      </button>
                      <button
                        onClick={(e) => handleDeleteConversation(e, conv._id)}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 transition-opacity ${
                          currentConversationId === conv._id
                            ? 'text-green-700 opacity-70 hover:opacity-100'
                            : 'text-red-600 opacity-60 hover:opacity-100'
                        }`}
                        title="Delete conversation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {!isOpen && (
            <div className="flex flex-col items-center gap-2 pt-4">
              {conversations.slice(0, 5).map((conv) => (
                <button
                  key={conv._id}
                  onClick={() => onSelectConversation(conv._id)}
                  className={`w-10 h-10 rounded-lg transition-colors flex items-center justify-center ${
                    currentConversationId === conv._id
                      ? 'bg-green-100 text-green-900'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title={conv.title}
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <div className={`p-2 border-t border-gray-200 ${isOpen ? 'min-w-[256px]' : ''}`}>
          <button
            onClick={onToggle}
            className={`w-full p-2.5 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center gap-2 group ${!isOpen ? 'px-0' : ''}`}
            title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isOpen ? (
              <>
                <ChevronLeft className="w-5 h-5 text-gray-600" />
                <span className="text-sm text-gray-600">Collapse</span>
              </>
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
