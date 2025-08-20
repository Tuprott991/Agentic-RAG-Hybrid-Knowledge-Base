export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

export interface ChatModel {
  id: string
  name: string
  description: string
  provider: string
  maxTokens: number
}

export interface EmbedModel {
  id: string
  name: string
  description: string
  dimensions: number
}

export interface Document {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: Date
  status: 'uploading' | 'processing' | 'completed' | 'error'
}

export interface ChatSettings {
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface StreamResponse {
  content: string
  done: boolean
}
