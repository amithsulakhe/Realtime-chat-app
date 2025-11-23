# Datastride - Real-Time Chat Application

A modern real-time chat application with intelligent autocomplete suggestions, hashtag support, and AI-powered responses using OpenAI Agents, Socket.io, and Next.js.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture & Flowchart](#architecture--flowchart)
- [Installation](#installation)
- [Building the Project](#building-the-project)
- [Usage](#usage)
- [Project Structure](#project-structure)

## ✨ Features

- **Real-Time Chat**: Instant messaging with Socket.io
- **Intelligent Autocomplete**: AI-powered suggestions for `@mentions` and `#hashtags`
- **OpenAI Integration**: GPT-4o-mini agents for:
  - Chat replies
  - Conversation title generation
  - User name suggestions
  - Hashtag suggestions
- **WhatsApp-Style UI**: Clean, modern chat interface
- **Redux State Management**: Centralized state with Redux Toolkit
- **TypeScript**: Full type safety
- **MongoDB**: Persistent storage for conversations and messages

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **Redux Toolkit** - State management
- **Socket.io Client** - Real-time communication
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **Socket.io** - Real-time bidirectional communication
- **OpenAI Agents** - AI-powered functionality
- **MongoDB + Mongoose** - Database and ODM
- **Zod** - Schema validation
- **TypeScript** - Type safety

## 🏗️ Architecture & Flowchart

### System Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Next.js)                        │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │   ChatWindow │───▶│  ChatInput   │───▶│ useAutocomplete│    │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│         │                    │                    │             │
│         │                    │                    ▼             │
│         │                    │            ┌──────────────┐     │
│         │                    │            │  Redux Store  │     │
│         │                    │            └──────────────┘     │
│         │                    │                    │             │
│         │                    ▼                    │             │
│         │            ┌──────────────┐            │             │
│         │            │ Socket.io   │────────────┘             │
│         │            │   Client    │                          │
│         └────────────┴──────────────┘                          │
│                    │                                            │
└────────────────────┼────────────────────────────────────────────┘
                     │
                     │ WebSocket Connection
                     │
┌────────────────────┼────────────────────────────────────────────┐
│                    │         SERVER (Node.js)                  │
│                    │                                            │
│            ┌───────▼────────┐                                   │
│            │ Socket.io      │                                   │
│            │   Server       │                                   │
│            └───────┬────────┘                                   │
│                    │                                            │
│    ┌──────────────┼──────────────┐                            │
│    │                │              │                            │
│    ▼                ▼              ▼                            │
│  ┌─────────┐  ┌──────────┐  ┌──────────────┐                   │
│  │ Reply    │  │ Title   │  │ Suggestion  │                   │
│  │ Agent    │  │ Agent    │  │ Agents      │                   │
│  └────┬─────┘  └────┬─────┘  └──────┬─────┘                   │
│       │             │               │                           │
│       └─────────────┴───────────────┘                           │
│                    │                                            │
│            ┌───────▼────────┐                                   │
│            │   OpenAI API    │                                   │
│            │  (GPT-4o-mini) │                                   │
│            └───────┬────────┘                                   │
│                    │                                            │
│            ┌───────▼────────┐                                   │
│            │    MongoDB     │                                   │
│            │   (Database)    │                                   │
│            └────────────────┘                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Detailed Flow Diagram

#### 1. User Input Flow (Autocomplete)

```
User Types "@" or "#"
        │
        ▼
┌───────────────────────┐
│   ChatInput Component │
│  - Detects trigger    │
│  - Extracts query     │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  useAutocomplete Hook  │
│  - Debounces request  │
│  - Opens suggestions  │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Socket.io Emit       │
│  "autocomplete-request"│
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Server Receives      │
│  - Validates request  │
│  - Routes to agent    │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  OpenAI Agent         │
│  - UserSuggestionAgent│
│  - HashtagSuggestion  │
│    Agent              │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  OpenAI API Call       │
│  (GPT-4o-mini)        │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Process Suggestions   │
│  - Format response     │
│  - Add IDs             │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Socket.io Emit       │
│  "autocomplete-response"│
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Client Receives      │
│  - Updates Redux      │
│  - Shows dropdown     │
└───────────────────────┘
```

#### 2. Message Sending Flow

```
User Sends Message
        │
        ▼
┌───────────────────────┐
│   ChatInput Component │
│  - Validates message  │
│  - Formats segments   │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  useMessages Hook     │
│  - Prepares payload   │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Socket.io Emit       │
│  "send-message"       │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Server Receives      │
│  - Saves to MongoDB   │
│  - Broadcasts to room │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Reply Agent Triggered│
│  - Generates response │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  OpenAI API Call      │
│  (GPT-4o-mini)        │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Bot Message Created  │
│  - Saved to MongoDB   │
│  - Broadcasted        │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Client Receives      │
│  "new-message"        │
│  - Updates Redux      │
│  - Renders message    │
└───────────────────────┘
```

#### 3. Component Hierarchy

```
App (Next.js)
    │
    ├─── RootLayout
    │       │
    │       └─── ReduxProvider
    │               │
    │               └─── ChatWindow
    │                       │
    │                       ├─── ChatSidebar
    │                       │       ├─── Conversation List
    │                       │       └─── New Chat Button
    │                       │
    │                       ├─── Chat Messages Area
    │                       │       ├─── ChatMessage (User)
    │                       │       ├─── ChatMessage (Bot)
    │                       │       └─── TypingIndicator
    │                       │
    │                       └─── ChatInput (Dynamic Import)
    │                               ├─── Segment Display
    │                               ├─── Input Field
    │                               └─── Suggestions Dropdown
```

### Data Flow

```
┌─────────────┐
│   Redux     │
│   Store     │
└──────┬──────┘
       │
       ├─── Messages State
       ├─── Suggestions State
       ├─── Loading State
       └─── UI State
            │
            ▼
┌─────────────────────┐
│  React Components    │
│  - Subscribe to state│
│  - Dispatch actions  │
└─────────────────────┘
```

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or MongoDB Atlas)
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd Datastride
```

### Step 2: Install Server Dependencies

```bash
cd server
npm install
```

### Step 3: Install Client Dependencies

```bash
cd ../client
npm install
```

### Step 4: Environment Setup

Create `.env` file in `server/` directory:

```env
OPENAI_API_KEY=your-openai-api-key-here
PORT=3001
CLIENT_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/datastride
```

Create `.env.local` file in `client/` directory (optional):

```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

## 🔨 Building the Project

### Build Server

```bash
cd server
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### Build Client

```bash
cd client
npm run build
```

This creates an optimized production build in the `.next/` directory.

### Production Start

**Server:**
```bash
cd server
npm start
```

**Client:**
```bash
cd client
npm start
```

### Development Mode

**Server:**
```bash
cd server
npm run dev
```

**Client:**
```bash
cd client
npm run dev
```

## 🚀 Usage

### Starting the Application

1. **Start MongoDB** (if using local instance):
   ```bash
   mongod
   ```

2. **Start Server** (in `server/` directory):
   ```bash
   npm run dev
   ```
   Server runs on `http://localhost:3001`

3. **Start Client** (in `client/` directory):
   ```bash
   npm run dev
   ```
   Client runs on `http://localhost:3000`

4. **Open Browser**: Navigate to `http://localhost:3000`

### Using the Chat

1. **Type a message** in the input field
2. **Tag users**: Type `@` followed by a name
   - Dropdown appears with AI-suggested users
   - Use arrow keys to navigate
   - Press Enter to select
3. **Create hashtags**: Type `#` followed by a word
   - Similar autocomplete appears
   - Select or continue typing
4. **Send message**: Press Enter or click send button
5. **Remove tags**: Backspace removes entire tags

## 📁 Project Structure

```
Datastride/
├── client/                      # Next.js Frontend
│   ├── app/                     # Next.js App Router
│   │   ├── layout.tsx          # Root layout with providers
│   │   ├── page.tsx             # Home page
│   │   ├── chat/
│   │   │   └── [id]/
│   │   │       └── page.tsx     # Chat page with ID
│   │   └── globals.css          # Global styles
│   ├── components/              # React Components
│   │   ├── ChatWindow.tsx      # Main chat container
│   │   ├── ChatInput.tsx       # Input with autocomplete
│   │   ├── ChatMessage.tsx     # Message display
│   │   ├── ChatSidebar.tsx     # Conversation sidebar
│   │   └── TypingIndicator.tsx  # Bot typing indicator
│   ├── lib/                     # Utilities & State
│   │   ├── store.ts            # Redux store
│   │   ├── slices/
│   │   │   └── chatSlice.ts     # Chat Redux slice
│   │   ├── hooks/
│   │   │   ├── useAutocomplete.ts  # Autocomplete logic
│   │   │   ├── useMessages.ts      # Message management
│   │   │   └── useSocket.ts         # Socket.io hooks
│   │   ├── socket.ts            # Socket.io client
│   │   ├── api/
│   │   │   └── axios.ts         # HTTP client
│   │   └── providers/
│   │       └── ReduxProvider.tsx # Redux provider
│   ├── package.json
│   └── tsconfig.json
│
└── server/                      # Node.js Backend
    ├── server.ts                # Express + Socket.io server
    ├── agent.ts                 # OpenAI agent utilities
    ├── config/
    │   └── database.ts          # MongoDB connection
    ├── models/                  # Mongoose Models
    │   ├── Conversation.ts     # Conversation model
    │   ├── Message.ts              # Message model
    │   ├── Hashtag.ts           # Hashtag model
    │   └── User.ts               # User model
    ├── package.json
    └── tsconfig.json
```

## 🔑 Key Components Explained

### Frontend Components

1. **ChatWindow**: Main orchestrator component
   - Manages conversation state
   - Handles navigation
   - Coordinates sidebar and messages

2. **ChatInput**: Input component with autocomplete
   - Detects `@` and `#` triggers
   - Manages segments (text, mentions, hashtags)
   - Handles keyboard navigation
   - Sends messages via Socket.io

3. **useAutocomplete**: Custom hook
   - Debounces requests
   - Manages suggestion state
   - Communicates with backend via Socket.io

4. **useMessages**: Custom hook
   - Loads conversation messages
   - Sends new messages
   - Handles real-time updates

### Backend Components

1. **Socket.io Server**: Real-time communication
   - Handles WebSocket connections
   - Manages rooms per conversation
   - Broadcasts messages

2. **OpenAI Agents**:
   - **Reply Agent**: Generates bot responses
   - **Title Agent**: Creates conversation titles
   - **User Suggestion Agent**: Suggests user names
   - **Hashtag Suggestion Agent**: Suggests hashtags

3. **MongoDB Models**: Data persistence
   - Conversations, Messages, Hashtags, Users

## 🔄 Socket.io Events

### Client → Server

- `autocomplete-request`: Request suggestions
- `send-message`: Send user message
- `load-messages`: Load conversation messages
- `create-conversation`: Create new conversation

### Server → Client

- `autocomplete-response`: Return suggestions
- `autocomplete-error`: Autocomplete error
- `new-message`: New message received
- `messages-loaded`: Messages loaded
- `bot-typing`: Bot typing indicator
- `conversation-created`: New conversation created

## 🧪 Testing the Build

After building, test the production build:

```bash
# Terminal 1 - Server
cd server
npm start

# Terminal 2 - Client
cd client
npm start
```

Visit `http://localhost:3000` and verify:
- ✅ Chat loads
- ✅ Can type messages
- ✅ `@` triggers user suggestions
- ✅ `#` triggers hashtag suggestions
- ✅ Messages send and receive
- ✅ Bot responds

## 📝 Notes

- The client uses dynamic imports for `ChatInput` to avoid SSR issues
- Socket.io connection is singleton pattern
- Redux manages all chat state
- OpenAI agents use GPT-4o-mini for cost efficiency
- MongoDB stores all persistent data

## 🐛 Troubleshooting

1. **Socket connection fails**: Check `CLIENT_URL` in server `.env`
2. **OpenAI errors**: Verify API key is valid
3. **MongoDB errors**: Ensure MongoDB is running
4. **Build errors**: Clear `node_modules` and reinstall

## 📄 License

ISC

---

Built with ❤️ using Next.js, Socket.io, and OpenAI
