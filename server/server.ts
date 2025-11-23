import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { Agent, run, setDefaultOpenAIKey } from '@openai/agents';
import { z } from 'zod';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import Conversation from './models/Conversation';
import Message from './models/Message';
import Hashtag from './models/Hashtag';
import job from './job';

dotenv.config();
connectDB();
job.start();

// Set OpenAI API key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in environment variables');
  process.exit(1);
}
setDefaultOpenAIKey(OPENAI_API_KEY);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// ==================== TYPES ====================
interface Suggestion {
  id: string;
  name: string;
  type: 'user' | 'hashtag';
  avatar?: string;
}

// ==================== AGENTS ====================

// Reply Agent
const replyAgent = new Agent({
  name: 'Chat Reply Agent',
  instructions: 'You are a helpful assistant. Reply briefly and naturally to user messages. Keep responses concise and friendly (under 100 words).',
  model: 'gpt-4o-mini',
  outputType: z.object({
    reply: z.string().describe('The assistant\'s reply to the user message'),
  }),
  modelSettings: {
    temperature: 0.7,
    maxTokens: 150,
  },
});

// Title Agent
const titleAgent = new Agent({
  name: 'Title Generator Agent',
  instructions: 'Generate a short, descriptive title (maximum 5-6 words) for a conversation based on the first message. Be concise and descriptive.',
  model: 'gpt-4o-mini',
  outputType: z.object({
    title: z.string().describe('A short, descriptive title (5-6 words maximum) for the conversation'),
  }),
  modelSettings: {
    temperature: 0.7,
    maxTokens: 30,
  },
});

// User Suggestion Agent
const userSuggestionAgent = new Agent({
  name: 'User Suggestion Agent',
  instructions: 'You suggest user names based on the query. Return exactly 4 realistic user names (first and last name) that match or are related to the query. If query is empty, suggest popular/common names.',
  model: 'gpt-4o-mini',
  outputType: z.object({
    suggestions: z.array(z.string()).max(4).describe('Array of exactly 4 user name suggestions'),
  }),
  modelSettings: {
    temperature: 0.8,
    maxTokens: 100,
  },
});

// Hashtag Suggestion Agent
const hashtagSuggestionAgent = new Agent({
  name: 'Hashtag Suggestion Agent',
  instructions: 'You suggest hashtags based on the query. Return exactly 4 hashtags (single words, no spaces, use camelCase if needed) that match or start with the query. If query is empty, suggest popular/common hashtags.',
  model: 'gpt-4o-mini',
  outputType: z.object({
    suggestions: z.array(z.string()).max(4).describe('Array of exactly 4 hashtag suggestions'),
  }),
  modelSettings: {
    temperature: 0.8,
    maxTokens: 100,
  },
});


// ==================== HELPER FUNCTIONS ====================

function extractOutput(result: any): any {
  // Zod handles the structure, just return finalOutput (like in agent.ts)
  return result?.finalOutput || null;
}

async function generateReply(text: string): Promise<string> {
  try {
    const result = await run(replyAgent, text);
    const output = extractOutput(result);
    return output?.reply || "Thanks for your message!";
  } catch (error) {
    console.error('Error generating reply:', error);
    return "Thanks for your message!";
  }
}

async function generateTitle(firstMessage: string): Promise<string> {
  try {
    const result = await run(titleAgent, `Generate a title for this conversation: "${firstMessage}"`);
    const output = extractOutput(result);
    const title = output?.title || firstMessage.slice(0, 50);
    return title.length > 60 ? title.slice(0, 57) + '...' : title;
  } catch (error) {
    console.error('Error generating title:', error);
    return firstMessage.length > 50 ? firstMessage.slice(0, 47) + '...' : firstMessage;
  }
}

async function getSuggestions(query: string, trigger: '@' | '#'): Promise<Suggestion[]> {
  try {
    const agent = trigger === '@' ? userSuggestionAgent : hashtagSuggestionAgent;
    const prompt = query.trim() 
      ? `Suggest ${trigger === '@' ? 'user names' : 'hashtags'} that match or start with: "${query}"`
      : `Suggest popular ${trigger === '@' ? 'user names' : 'hashtags'}`;

    const result = await run(agent, prompt);
    const output = extractOutput(result);
    const suggestions = output?.suggestions || [];
    
    return suggestions.slice(0, 4).map((name: string, index: number) => ({
      id: `${trigger}-${Date.now()}-${index}`,
      name: String(name).trim(),
      type: trigger === '@' ? 'user' as const : 'hashtag' as const,
      avatar: trigger === '@' ? '👤' : undefined,
    }));
  } catch (error) {
    console.error('Error getting suggestions:', error);
    return [];
  }
}

// ==================== MESSAGE HELPER FUNCTIONS ====================

interface Segment {
  type: 'text' | 'hashtag' | 'mention';
  content: string;
  id?: string;
  name?: string;
}

interface FormattedMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  segments: Segment[];
  currentText: string;
  timestamp: string;
}

function formatMessage(msg: any): FormattedMessage {
  return {
    id: msg._id.toString(),
    type: msg.type || msg.sender || 'user',
    content: msg.content || msg.text || '',
    segments: msg.segments || [],
    currentText: msg.currentText || '',
    timestamp: msg.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

async function updateHashtagUsage(segments: Segment[]): Promise<void> {
  for (const segment of segments) {
    if (segment.type === 'hashtag') {
      await Hashtag.findOneAndUpdate(
        { name: segment.content.toLowerCase() },
        { $inc: { usageCount: 1 } },
        { upsert: true, new: true }
      );
    }
  }
}

async function handleFirstMessageTitle(
  conversation: any,
  firstMessageText: string,
  io: Server
): Promise<void> {
  if (conversation.title === 'New Chat' || !conversation.title) {
    try {
      const title = await generateTitle(firstMessageText);
      conversation.title = title;
      conversation.updatedAt = new Date();
      await conversation.save();
      
      io.emit('conversation-updated', {
        _id: conversation._id.toString(),
        title: String(title),
        updatedAt: conversation.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error('Error generating/saving title:', error);
    }
  }
}

async function createUserMessage(
  conversationId: string,
  content: string,
  segments: Segment[],
  currentText: string,
  timestamp: string
): Promise<any> {
  const userMessage = new Message({
    conversationId,
    type: 'user',
    content,
    segments,
    currentText,
    timestamp,
  });
  await userMessage.save();
  return userMessage;
}

async function createBotMessage(conversationId: string, replyText: string): Promise<any> {
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const botMessage = new Message({
    conversationId,
    type: 'bot',
    content: replyText,
    segments: [],
    currentText: '',
    timestamp,
  });
  await botMessage.save();
  return botMessage;
}

// ==================== API ROUTES ====================

app.get('/api/conversations', async (req: express.Request, res: express.Response) => {
  try {
    const conversations = await Conversation.find().sort({ updatedAt: -1 });
    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

app.post('/api/conversations', async (req: express.Request, res: express.Response) => {
  try {
    const conversation = new Conversation({ title: 'New Chat' });
    await conversation.save();
    res.json({ success: true, conversation });
  } catch (error) {
    res.status(400).json({ error: 'Failed to create conversation' });
  }
});

app.delete('/api/conversations/:id', async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;

    // Verify conversation exists
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Delete all messages associated with this conversation
    await Message.deleteMany({ conversationId: id });

    // Delete the conversation
    await Conversation.findByIdAndDelete(id);

    // Emit socket event to notify all clients
    io.emit('conversation-deleted', { conversationId: id });

    res.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});


// ==================== SOCKET HANDLERS ====================

io.on('connection', (socket: any) => {
  console.log('Client connected:', socket.id);
  
  // Autocomplete handler
  socket.on('autocomplete-request', async (data: { query: string; trigger: '@' | '#' }) => {
    try {
      const { query, trigger } = z.object({
        query: z.string(),
        trigger: z.enum(['@', '#'])
      }).parse(data);
      
      const suggestions = await getSuggestions(query, trigger);
      socket.emit('autocomplete-response', { suggestions, query, trigger });
    } catch (error) {
      console.error('Autocomplete error:', error);
      socket.emit('autocomplete-error', { error: 'Invalid request' });
    }
  });

  // Load messages handler
  socket.on('load-messages', async (data: { conversationId: string }) => {
    try {
      const { conversationId } = z.object({
        conversationId: z.string()
      }).parse(data);

      const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
      const formatted = messages.map(msg => formatMessage(msg));
      
      socket.emit('messages-loaded', { conversationId, messages: formatted });
    } catch (error) {
      console.error('Error loading messages:', error);
      socket.emit('messages-error', { error: 'Failed to load messages' });
    }
  });


  // Send message handler
  socket.on('send-message', async (data: { 
    conversationId: string; 
    type: 'user' | 'bot';
    content: string;
    segments: Segment[];
    currentText: string;
    timestamp: string;
  }) => {
    try {
      // Validate input
      const { conversationId, type, content, segments, currentText, timestamp } = z.object({
        conversationId: z.string(),
        type: z.enum(['user', 'bot']),
        content: z.string(),
        segments: z.array(z.object({
          type: z.enum(['text', 'hashtag', 'mention']),
          content: z.string(),
          id: z.string().optional(),
          name: z.string().optional(),
        })),
        currentText: z.string(),
        timestamp: z.string(),
      }).parse(data);

      // Verify conversation exists
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        socket.emit('message-error', { error: 'Conversation not found' });
        return;
      }

      // Check if this is the first message
      const isFirstMessage = (await Message.countDocuments({ conversationId })) === 0;

      // Create and save user message
      const userMessage = await createUserMessage(conversationId, content, segments, currentText, timestamp);
      const formattedUserMsg = formatMessage(userMessage);

      // Update conversation timestamp
      conversation.updatedAt = new Date();
      await conversation.save();

      // Emit user message and bot typing indicator
      io.emit('new-message', { ...formattedUserMsg, conversationId });
      io.emit('bot-typing', { conversationId, isTyping: true });

      // Handle first message title generation (async, non-blocking)
      if (isFirstMessage) {
        handleFirstMessageTitle(conversation, content, io).catch(err => 
          console.error('Error handling first message title:', err)
        );
      }

      // Update hashtag usage from segments
      await updateHashtagUsage(segments);

      // Generate and save bot reply
      const replyText = await generateReply(content);
      const botMessage = await createBotMessage(conversationId, replyText);
      const formattedBotMsg = formatMessage(botMessage);

      // Update conversation timestamp again
      conversation.updatedAt = new Date();
      await conversation.save();

      // Emit bot message and stop typing indicator
      io.emit('bot-typing', { conversationId, isTyping: false });
      io.emit('new-message', { ...formattedBotMsg, conversationId });

      // Confirm to sender
      socket.emit('message-sent', { success: true, message: formattedUserMsg });
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('message-error', { error: 'Failed to send message' });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ==================== SERVER START ====================

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
