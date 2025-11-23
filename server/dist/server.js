"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const agents_1 = require("@openai/agents");
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const Conversation_1 = __importDefault(require("./models/Conversation"));
const Message_1 = __importDefault(require("./models/Message"));
const Hashtag_1 = __importDefault(require("./models/Hashtag"));
dotenv_1.default.config();
(0, database_1.connectDB)();
// Set OpenAI API key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set in environment variables');
    process.exit(1);
}
(0, agents_1.setDefaultOpenAIKey)(OPENAI_API_KEY);
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true
}));
app.use(express_1.default.json());
// ==================== AGENTS ====================
// Reply Agent
const replyAgent = new agents_1.Agent({
    name: 'Chat Reply Agent',
    instructions: 'You are a helpful assistant. Reply briefly and naturally to user messages. Keep responses concise and friendly (under 100 words).',
    model: 'gpt-4o-mini',
    outputType: zod_1.z.object({
        reply: zod_1.z.string().describe('The assistant\'s reply to the user message'),
    }),
    modelSettings: {
        temperature: 0.7,
        maxTokens: 150,
    },
});
// Title Agent
const titleAgent = new agents_1.Agent({
    name: 'Title Generator Agent',
    instructions: 'Generate a short, descriptive title (maximum 5-6 words) for a conversation based on the first message. Be concise and descriptive.',
    model: 'gpt-4o-mini',
    outputType: zod_1.z.object({
        title: zod_1.z.string().describe('A short, descriptive title (5-6 words maximum) for the conversation'),
    }),
    modelSettings: {
        temperature: 0.7,
        maxTokens: 30,
    },
});
// User Suggestion Agent
const userSuggestionAgent = new agents_1.Agent({
    name: 'User Suggestion Agent',
    instructions: 'You suggest user names based on the query. Return exactly 4 realistic user names (first and last name) that match or are related to the query. If query is empty, suggest popular/common names.',
    model: 'gpt-4o-mini',
    outputType: zod_1.z.object({
        suggestions: zod_1.z.array(zod_1.z.string()).max(4).describe('Array of exactly 4 user name suggestions'),
    }),
    modelSettings: {
        temperature: 0.8,
        maxTokens: 100,
    },
});
// Hashtag Suggestion Agent
const hashtagSuggestionAgent = new agents_1.Agent({
    name: 'Hashtag Suggestion Agent',
    instructions: 'You suggest hashtags based on the query. Return exactly 4 hashtags (single words, no spaces, use camelCase if needed) that match or start with the query. If query is empty, suggest popular/common hashtags.',
    model: 'gpt-4o-mini',
    outputType: zod_1.z.object({
        suggestions: zod_1.z.array(zod_1.z.string()).max(4).describe('Array of exactly 4 hashtag suggestions'),
    }),
    modelSettings: {
        temperature: 0.8,
        maxTokens: 100,
    },
});
// ==================== HELPER FUNCTIONS ====================
function extractOutput(result) {
    // Zod handles the structure, just return finalOutput (like in agent.ts)
    return result?.finalOutput || null;
}
async function generateReply(text) {
    try {
        const result = await (0, agents_1.run)(replyAgent, text);
        const output = extractOutput(result);
        return output?.reply || "Thanks for your message!";
    }
    catch (error) {
        console.error('Error generating reply:', error);
        return "Thanks for your message!";
    }
}
async function generateTitle(firstMessage) {
    try {
        const result = await (0, agents_1.run)(titleAgent, `Generate a title for this conversation: "${firstMessage}"`);
        const output = extractOutput(result);
        const title = output?.title || firstMessage.slice(0, 50);
        return title.length > 60 ? title.slice(0, 57) + '...' : title;
    }
    catch (error) {
        console.error('Error generating title:', error);
        return firstMessage.length > 50 ? firstMessage.slice(0, 47) + '...' : firstMessage;
    }
}
async function getSuggestions(query, trigger) {
    try {
        const agent = trigger === '@' ? userSuggestionAgent : hashtagSuggestionAgent;
        const prompt = query.trim()
            ? `Suggest ${trigger === '@' ? 'user names' : 'hashtags'} that match or start with: "${query}"`
            : `Suggest popular ${trigger === '@' ? 'user names' : 'hashtags'}`;
        const result = await (0, agents_1.run)(agent, prompt);
        const output = extractOutput(result);
        const suggestions = output?.suggestions || [];
        return suggestions.slice(0, 4).map((name, index) => ({
            id: `${trigger}-${Date.now()}-${index}`,
            name: String(name).trim(),
            type: trigger === '@' ? 'user' : 'hashtag',
            avatar: trigger === '@' ? '👤' : undefined,
        }));
    }
    catch (error) {
        console.error('Error getting suggestions:', error);
        return [];
    }
}
function formatMessage(msg) {
    return {
        id: msg._id.toString(),
        type: msg.type || msg.sender || 'user',
        content: msg.content || msg.text || '',
        segments: msg.segments || [],
        currentText: msg.currentText || '',
        timestamp: msg.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
}
async function updateHashtagUsage(segments) {
    for (const segment of segments) {
        if (segment.type === 'hashtag') {
            await Hashtag_1.default.findOneAndUpdate({ name: segment.content.toLowerCase() }, { $inc: { usageCount: 1 } }, { upsert: true, new: true });
        }
    }
}
async function handleFirstMessageTitle(conversation, firstMessageText, io) {
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
        }
        catch (error) {
            console.error('Error generating/saving title:', error);
        }
    }
}
async function createUserMessage(conversationId, content, segments, currentText, timestamp) {
    const userMessage = new Message_1.default({
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
async function createBotMessage(conversationId, replyText) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const botMessage = new Message_1.default({
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
app.get('/api/conversations', async (req, res) => {
    try {
        const conversations = await Conversation_1.default.find().sort({ updatedAt: -1 });
        res.json({ conversations });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});
app.post('/api/conversations', async (req, res) => {
    try {
        const conversation = new Conversation_1.default({ title: 'New Chat' });
        await conversation.save();
        res.json({ success: true, conversation });
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to create conversation' });
    }
});
app.delete('/api/conversations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Verify conversation exists
        const conversation = await Conversation_1.default.findById(id);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        // Delete all messages associated with this conversation
        await Message_1.default.deleteMany({ conversationId: id });
        // Delete the conversation
        await Conversation_1.default.findByIdAndDelete(id);
        // Emit socket event to notify all clients
        io.emit('conversation-deleted', { conversationId: id });
        res.json({ success: true, message: 'Conversation deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting conversation:', error);
        res.status(500).json({ error: 'Failed to delete conversation' });
    }
});
// ==================== SOCKET HANDLERS ====================
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    // Autocomplete handler
    socket.on('autocomplete-request', async (data) => {
        try {
            const { query, trigger } = zod_1.z.object({
                query: zod_1.z.string(),
                trigger: zod_1.z.enum(['@', '#'])
            }).parse(data);
            const suggestions = await getSuggestions(query, trigger);
            socket.emit('autocomplete-response', { suggestions, query, trigger });
        }
        catch (error) {
            console.error('Autocomplete error:', error);
            socket.emit('autocomplete-error', { error: 'Invalid request' });
        }
    });
    // Load messages handler
    socket.on('load-messages', async (data) => {
        try {
            const { conversationId } = zod_1.z.object({
                conversationId: zod_1.z.string()
            }).parse(data);
            const messages = await Message_1.default.find({ conversationId }).sort({ createdAt: 1 });
            const formatted = messages.map(msg => formatMessage(msg));
            socket.emit('messages-loaded', { conversationId, messages: formatted });
        }
        catch (error) {
            console.error('Error loading messages:', error);
            socket.emit('messages-error', { error: 'Failed to load messages' });
        }
    });
    // Send message handler
    socket.on('send-message', async (data) => {
        try {
            // Validate input
            const { conversationId, type, content, segments, currentText, timestamp } = zod_1.z.object({
                conversationId: zod_1.z.string(),
                type: zod_1.z.enum(['user', 'bot']),
                content: zod_1.z.string(),
                segments: zod_1.z.array(zod_1.z.object({
                    type: zod_1.z.enum(['text', 'hashtag', 'mention']),
                    content: zod_1.z.string(),
                    id: zod_1.z.string().optional(),
                    name: zod_1.z.string().optional(),
                })),
                currentText: zod_1.z.string(),
                timestamp: zod_1.z.string(),
            }).parse(data);
            // Verify conversation exists
            const conversation = await Conversation_1.default.findById(conversationId);
            if (!conversation) {
                socket.emit('message-error', { error: 'Conversation not found' });
                return;
            }
            // Check if this is the first message
            const isFirstMessage = (await Message_1.default.countDocuments({ conversationId })) === 0;
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
                handleFirstMessageTitle(conversation, content, io).catch(err => console.error('Error handling first message title:', err));
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
        }
        catch (error) {
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
