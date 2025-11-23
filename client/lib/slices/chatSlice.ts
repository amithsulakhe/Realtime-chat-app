import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Segment {
  type: 'text' | 'hashtag' | 'mention';
  content: string;
  id?: string;
  name?: string;
}

export interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  segments: Segment[];
  currentText: string;
  timestamp: string;
  conversationId?: string;
}


export interface Suggestion {
  id: string;
  name: string;
  type: 'user' | 'hashtag';
  avatar?: string;
}

interface ChatState {
  messages: Message[];
  suggestions: Suggestion[];
  isSuggestionsOpen: boolean;
  suggestionQuery: string;
  suggestionTrigger: '@' | '#' | null;
  suggestionPosition: { top: number; left: number } | null;
  isLoading: boolean;
  isBotTyping: boolean;
}

const initialState: ChatState = {
  messages: [],
  suggestions: [],
  isSuggestionsOpen: false,
  suggestionQuery: '',
  suggestionTrigger: null,
  suggestionPosition: null,
  isLoading: false,
  isBotTyping: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages = action.payload;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      // Check if message already exists to prevent duplicates
      const exists = state.messages.some(msg => msg.id === action.payload.id);
      if (!exists) {
        state.messages.push(action.payload);
      }
    },
    setSuggestions: (state, action: PayloadAction<Suggestion[]>) => {
      state.suggestions = action.payload;
    },
    openSuggestions: (
      state,
      action: PayloadAction<{
        query: string;
        trigger: '@' | '#';
        position: { top: number; left: number };
      }>
    ) => {
      state.isSuggestionsOpen = true;
      state.suggestionQuery = action.payload.query;
      state.suggestionTrigger = action.payload.trigger;
      state.suggestionPosition = action.payload.position;
    },
    closeSuggestions: (state) => {
      state.isSuggestionsOpen = false;
      state.suggestionQuery = '';
      state.suggestionTrigger = null;
      state.suggestionPosition = null;
      state.suggestions = [];
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setBotTyping: (state, action: PayloadAction<boolean>) => {
      state.isBotTyping = action.payload;
    },
  },
});

export const {
  setMessages,
  addMessage,
  setSuggestions,
  openSuggestions,
  closeSuggestions,
  setLoading,
  setBotTyping,
} = chatSlice.actions;

export default chatSlice.reducer;

