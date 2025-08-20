import axios from 'axios'
import type { Message, ChatModel, EmbedModel, Document, ChatSettings } from '../types'

const API_BASE_URL = 'http://35.197.140.70:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export class ChatAPI {
  static async getChatModels(): Promise<ChatModel[]> {
    // Mock data for now - replace with actual API call
    return [
      {
        id: 'qwen-8b',
        name: 'Qwen 3 8B',
        description: 'Powerful general-purpose model',
        provider: 'Alibaba',
        maxTokens: 8192,
      },
      {
        id: 'llama-7b',
        name: 'Llama 2 7B Chat',
        description: 'Meta\'s conversational AI model',
        provider: 'Meta',
        maxTokens: 4096,
      },
      {
        id: 'dialogpt-medium',
        name: 'DialoGPT Medium',
        description: 'Microsoft\'s conversational model',
        provider: 'Microsoft',
        maxTokens: 1024,
      },
    ]
  }

  static async getEmbedModels(): Promise<EmbedModel[]> {
    // Mock data for now - replace with actual API call
    return [
      {
        id: 'sentence-transformers',
        name: 'all-MiniLM-L6-v2',
        description: 'Fast and efficient embedding model',
        dimensions: 384,
      },
      {
        id: 'openai-embed',
        name: 'text-embedding-ada-002',
        description: 'OpenAI embedding model',
        dimensions: 1536,
      },
    ]
  }

  static async sendMessage(
    messages: Message[],
    modelId: string,
    settings: { maxTokens: number; temperature: number },
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const payload = {
      model: modelId === 'qwen-8b' ? 'Qwen/Qwen3-8B' : modelId,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      max_tokens: settings.maxTokens,
      temperature: settings.temperature,
      stream: true,
    }

    try {
      const response = await fetch(`${API_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body reader available')
      }

      let fullResponse = ''
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data.trim() === '[DONE]') {
              return fullResponse
            }

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content || ''
              if (content) {
                fullResponse += content
                onChunk?.(content)
              }
            } catch {
              // Ignore JSON parse errors for malformed chunks
            }
          }
        }
      }

      return fullResponse
    } catch (error) {
      console.error('Chat API error:', error)
      throw error
    }
  }

  static async uploadDocument(file: File): Promise<Document> {
    const formData = new FormData()
    formData.append('file', file)

    // Mock upload for now - replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date(),
          status: 'completed',
        })
      }, 2000)
    })
  }

  static async getDocuments(): Promise<Document[]> {
    // Mock data for now - replace with actual API call
    return []
  }

  static async deleteDocument(id: string): Promise<void> {
    // Mock delete for now - replace with actual API call
    console.log('Deleting document:', id)
  }
}

export default api
