"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Menu } from "lucide-react";
import { useMessages } from "../lib/hooks/useMessages";
import { useSocket } from "../lib/hooks/useSocket";
import ChatMessage from "./ChatMessage";
import ChatSidebar from "./ChatSidebar";
import TypingIndicator from "./TypingIndicator";
import apiClient from "../lib/api/axios";

// Dynamically import ChatInput to avoid SSR issues with TipTap
const ChatInput = dynamic(() => import("./ChatInput"), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-b-2xl shadow-lg p-4">
      <div className="min-h-12 p-3 border-2 border-gray-300 rounded-xl bg-gray-50 flex items-center gap-2">
        <div className="flex-1 min-w-32 text-gray-400">Loading editor...</div>
      </div>
    </div>
  ),
});

interface ChatWindowProps {
  conversationId?: string;
}

export default function ChatWindow({
  conversationId,
}: ChatWindowProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);


  const { messages, isBotTyping, loading } = useMessages(conversationId as string | null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isBotTyping]);

  // Responsive: Auto-close sidebar on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleNewChat = async () => {
    try {
      const { data } = await apiClient.post("/conversations");
      if (data.conversation) {
        // Navigate to the new conversation URL
        router.push(`/chat/${data.conversation._id}`);
        // Trigger sidebar refresh to show new conversation
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const handleSelectConversation = (id: string) => {
    // Navigate to the selected conversation URL
    if (id) {
      router.push(`/chat/${id}`);
    } else {
      router.push('/');
    }
  };

  // Listen for conversation deletions and navigate away if current conversation is deleted
  useSocket('conversation-deleted', (data: { conversationId: string }) => {
    if (data.conversationId === conversationId) {
      // Navigate to home if the current conversation was deleted
      router.push('/');
    }
    // Refresh sidebar
    setRefreshTrigger((prev) => prev + 1);
  });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <ChatSidebar
        currentConversationId={conversationId as string | null}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        refreshTrigger={refreshTrigger}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with mobile menu button */}
        <div className="bg-green-600 text-white px-4 py-3 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-green-700 rounded-lg transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center font-semibold">
              C
            </div>
            <div>
              <h1 className="text-lg font-semibold">Real-Time Chat App</h1>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {!conversationId ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center px-4">
                <p className="text-lg mb-2">No conversation selected</p>
                <p className="text-sm">
                  Click &quot;New Chat&quot; to start a conversation
                </p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center px-4">
                <p className="text-lg mb-2">No messages yet</p>
                <p className="text-sm">
                  Start typing and use @ for users or # for hashtags
                </p>
              </div>
            </div>
          ) : (
            <div className="py-4">
              {messages.map((message: any) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isBotTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        {conversationId && <ChatInput conversationId={conversationId} />}
      </div>
    </div>
  );
}
