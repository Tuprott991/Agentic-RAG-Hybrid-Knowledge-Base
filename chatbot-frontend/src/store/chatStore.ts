import { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { Message, ChatModel, EmbedModel, Document, ChatSettings } from '../types'

interface ChatState {
  messages: Message[]
  chatModels: ChatModel[]
  embedModels: EmbedModel[]
  selectedChatModel: string | null
  selectedEmbedModel: string | null
  documents: Document[]
  settings: ChatSettings
  isStreaming: boolean
  sidebarWidth: number
}

type ChatAction =
  | { type: 'ADD_MESSAGE'; payload: Omit<Message, 'id' | 'timestamp'> }
  | { type: 'ADD_MESSAGE_WITH_ID'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; content: string } }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_CHAT_MODELS'; payload: ChatModel[] }
  | { type: 'SET_EMBED_MODELS'; payload: EmbedModel[] }
  | { type: 'SET_SELECTED_CHAT_MODEL'; payload: string }
  | { type: 'SET_SELECTED_EMBED_MODEL'; payload: string }
  | { type: 'SET_DOCUMENTS'; payload: Document[] }
  | { type: 'ADD_DOCUMENT'; payload: Document }
  | { type: 'REMOVE_DOCUMENT'; payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<ChatSettings> }
  | { type: 'SET_STREAMING'; payload: boolean }
  | { type: 'SET_SIDEBAR_WIDTH'; payload: number }

export const initialState: ChatState = {
  messages: [],
  chatModels: [],
  embedModels: [],
  selectedChatModel: null,
  selectedEmbedModel: null,
  documents: [],
  settings: {
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
  isStreaming: false,
  sidebarWidth: 320,
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            ...action.payload,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date(),
          },
        ],
      }
    case 'ADD_MESSAGE_WITH_ID':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      }
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.payload.id
            ? { ...msg, content: action.payload.content }
            : msg
        ),
      }
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] }
    case 'SET_CHAT_MODELS':
      return { ...state, chatModels: action.payload }
    case 'SET_EMBED_MODELS':
      return { ...state, embedModels: action.payload }
    case 'SET_SELECTED_CHAT_MODEL':
      return { ...state, selectedChatModel: action.payload }
    case 'SET_SELECTED_EMBED_MODEL':
      return { ...state, selectedEmbedModel: action.payload }
    case 'SET_DOCUMENTS':
      return { ...state, documents: action.payload }
    case 'ADD_DOCUMENT':
      return { ...state, documents: [...state.documents, action.payload] }
    case 'REMOVE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.filter((doc) => doc.id !== action.payload),
      }
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } }
    case 'SET_STREAMING':
      return { ...state, isStreaming: action.payload }
    case 'SET_SIDEBAR_WIDTH':
      return { ...state, sidebarWidth: action.payload }
    default:
      return state
  }
}

export const ChatContext = createContext<{
  state: ChatState
  dispatch: React.Dispatch<ChatAction>
} | null>(null)

export const useChatStore = () => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatStore must be used within a ChatProvider')
  }
  return context
}

// Helper functions for actions
export const chatActions = {
  addMessage: (payload: Omit<Message, 'id' | 'timestamp'>) => ({ type: 'ADD_MESSAGE' as const, payload }),
  addMessageWithId: (payload: Message) => ({ type: 'ADD_MESSAGE_WITH_ID' as const, payload }),
  updateMessage: (id: string, content: string) => ({ type: 'UPDATE_MESSAGE' as const, payload: { id, content } }),
  clearMessages: () => ({ type: 'CLEAR_MESSAGES' as const }),
  setChatModels: (payload: ChatModel[]) => ({ type: 'SET_CHAT_MODELS' as const, payload }),
  setEmbedModels: (payload: EmbedModel[]) => ({ type: 'SET_EMBED_MODELS' as const, payload }),
  setSelectedChatModel: (payload: string) => ({ type: 'SET_SELECTED_CHAT_MODEL' as const, payload }),
  setSelectedEmbedModel: (payload: string) => ({ type: 'SET_SELECTED_EMBED_MODEL' as const, payload }),
  setDocuments: (payload: Document[]) => ({ type: 'SET_DOCUMENTS' as const, payload }),
  addDocument: (payload: Document) => ({ type: 'ADD_DOCUMENT' as const, payload }),
  removeDocument: (payload: string) => ({ type: 'REMOVE_DOCUMENT' as const, payload }),
  updateSettings: (payload: Partial<ChatSettings>) => ({ type: 'UPDATE_SETTINGS' as const, payload }),
  setStreaming: (payload: boolean) => ({ type: 'SET_STREAMING' as const, payload }),
  setSidebarWidth: (payload: number) => ({ type: 'SET_SIDEBAR_WIDTH' as const, payload }),
}
