import axios from 'axios'
import type { Message, ChatModel, EmbedModel, Document } from '../types'

// Define additional types for multimodal content
export interface MessageContent {
  type: 'text' | 'image_url' | 'file'
  text?: string
  image_url?: {
    url: string
  }
  file?: {
    filename: string
    file_data: string
  }
}

// API Configuration
export interface APIConfig {
  provider: 'openrouter' | 'self-hosted'
  baseUrl: string
  apiKey: string
  headers?: Record<string, string>
}

// Default configurations
const OPENROUTER_CONFIG: APIConfig = {
  provider: 'openrouter',
  baseUrl: 'https://openrouter.ai/api/v1',
  apiKey: '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',
  headers: {
    'HTTP-Referer': 'http://localhost:5173',
    'X-Title': 'Prudential AI Chatbot',
  }
}

const SELF_HOSTED_CONFIG: APIConfig = {
  provider: 'self-hosted',
  baseUrl: 'https://e0e11edb7719.ngrok-free.app/v1',
  apiKey: 'your-self-hosted-api-key', // Replace with your actual API key
}

// Current active configuration (can be changed at runtime)
let currentConfig: APIConfig = OPENROUTER_CONFIG

// Create axios instance that updates when config changes
const createApiInstance = (config: APIConfig) => {
  return axios.create({
    baseURL: config.baseUrl,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      ...config.headers,
    },
  })
}

let api = createApiInstance(currentConfig)

export class ChatAPI {
  // Configuration management methods
  static setConfiguration(config: APIConfig) {
    currentConfig = config
    api = createApiInstance(currentConfig)
    console.log(`Switched to ${config.provider} API:`, config.baseUrl)
  }

  static setOpenRouterProvider() {
    this.setConfiguration(OPENROUTER_CONFIG)
  }

  static setSelfHostedProvider(baseUrl?: string, apiKey?: string) {
    const config: APIConfig = {
      ...SELF_HOSTED_CONFIG,
      ...(baseUrl && { baseUrl: baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1` }),
      ...(apiKey && { apiKey }),
    }
    this.setConfiguration(config)
  }

  static getCurrentConfig(): APIConfig {
    return { ...currentConfig }
  }

  static async getChatModels(): Promise<ChatModel[]> {
    // OpenRouter available models
    return [
      {
        id: 'openai/gpt-oss-20b:free',
        name: 'GPT OSS 20B (Free)',
        description: 'Free 20B parameter model',
        provider: 'OpenAI',
        maxTokens: 4096,
      },
      {
        id: 'anthropic/claude-3-haiku',
        name: 'Claude 3 Haiku',
        description: 'Fast and efficient Claude model',
        provider: 'Anthropic',
        maxTokens: 200000,
      },
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        description: 'Advanced reasoning and analysis',
        provider: 'Anthropic',
        maxTokens: 200000,
      },
      {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'Fast and affordable GPT-4 model',
        provider: 'OpenAI',
        maxTokens: 128000,
      },
      {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        description: 'Most capable GPT-4 model',
        provider: 'OpenAI',
        maxTokens: 128000,
      },
      {
        id: 'meta-llama/llama-3.2-3b-instruct',
        name: 'Llama 3.2 3B Instruct',
        description: 'Efficient instruction-following model',
        provider: 'Meta',
        maxTokens: 131072,
      },
      {
        id: 'google/gemma-3-27b-it:free',
        name: 'Google Gemma 3 27B ',
        description: 'Google\'s latest opensource chat model',
        provider: 'Google',
        maxTokens: 96000,
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

  // File upload method for processing files before sending message
  static async uploadFiles(files: File[]): Promise<MessageContent[]> {
    const fileContents: MessageContent[] = []
    
    for (const file of files) {
      try {
        if (file.type.startsWith('image/')) {
          // Convert image to base64
          const base64Data = await this.fileToBase64(file)
          fileContents.push({
            type: 'image_url',
            image_url: {
              url: base64Data
            }
          })
        } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          // Convert PDF to base64
          const base64Data = await this.fileToBase64(file)
          fileContents.push({
            type: 'file',
            file: {
              filename: file.name,
              file_data: base64Data
            }
          })
        } else if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
          // For text files, read content directly
          const textContent = await this.readTextFile(file)
          fileContents.push({
            type: 'text',
            text: `[Text File: ${file.name}]\n${textContent}`
          })
        } else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
          // For Word documents, try to convert to base64
          const base64Data = await this.fileToBase64(file)
          fileContents.push({
            type: 'file',
            file: {
              filename: file.name,
              file_data: base64Data
            }
          })
        } else {
          // For other file types, convert to base64
          const base64Data = await this.fileToBase64(file)
          fileContents.push({
            type: 'file',
            file: {
              filename: file.name,
              file_data: base64Data
            }
          })
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error)
        // Add error as text content
        fileContents.push({
          type: 'text',
          text: `[File: ${file.name} - Error processing file: ${error}]`
        })
      }
    }
    
    return fileContents
  }

  // Helper method to convert file to base64
  private static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result)
      }
      reader.onerror = () => reject(new Error('Error reading file'))
      reader.readAsDataURL(file)
    })
  }

  // Helper method to read text files
  private static async readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result
        if (typeof result === 'string') {
          // Limit text to 2000 characters to avoid token limits
          resolve(result.length > 2000 ? result.substring(0, 2000) + '...' : result)
        } else {
          reject(new Error('Failed to read file as text'))
        }
      }
      reader.onerror = () => reject(new Error('Error reading file'))
      reader.readAsText(file)
    })
  }

  static async sendMessage(
    messages: Message[],
    modelId: string,
    settings: { maxTokens: number; temperature: number },
    onChunk?: (chunk: string) => void,
    files?: File[]
  ): Promise<string> {
    console.log('Sending message with model:', modelId)
    console.log('Messages:', messages)
    console.log('Files:', files)
    
    // Process files if provided
    let messageContent: (string | MessageContent)[] = []
    if (files && files.length > 0) {
      console.log('Processing uploaded files...')
      const fileContents = await this.uploadFiles(files)
      
      // Create multimodal content for the last user message
      const lastMessage = messages[messages.length - 1]
      if (lastMessage && lastMessage.role === 'user') {
        messageContent = [
          {
            type: 'text',
            text: lastMessage.content
          },
          ...fileContents
        ]
      }
      console.log('Multimodal content:', messageContent)
    }

    try {
      const apiMessages = messages.map((msg, index) => {
        // Use multimodal content for the last user message if files are attached
        if (index === messages.length - 1 && msg.role === 'user' && messageContent.length > 0) {
          // For self-hosted endpoints, convert multimodal content to text
          if (currentConfig.provider === 'self-hosted') {
            let textContent = ''
            for (const content of messageContent) {
              if (typeof content === 'string') {
                textContent += content + '\n'
              } else if (content.type === 'text') {
                textContent += content.text + '\n'
              } else if (content.type === 'image_url') {
                textContent += `[Image attached: ${content.image_url?.url?.substring(0, 50)}...]\n`
              } else if (content.type === 'file') {
                textContent += `[File attached: ${content.file?.filename}]\n`
              }
            }
            return {
              "role": msg.role,
              "content": textContent.trim()
            }
          } else {
            // For OpenRouter, use multimodal format
            return {
              "role": msg.role,
              "content": messageContent
            }
          }
        }
        return {
          "role": msg.role,
          "content": msg.content
        }
      })

      console.log('API Messages:', JSON.stringify(apiMessages, null, 2))
      console.log('Provider-specific processing:', currentConfig.provider)
      if (currentConfig.provider === 'self-hosted' && files && files.length > 0) {
        console.log('Self-hosted: Converting multimodal content to text-only format')
      }

      const apiUrl = currentConfig.provider === 'openrouter' 
        ? `${currentConfig.baseUrl}/chat/completions`
        : `${currentConfig.baseUrl}/chat/completions`

      const headers: Record<string, string> = {
        "Authorization": `Bearer ${currentConfig.apiKey}`,
        "Content-Type": "application/json",
        ...currentConfig.headers,
      }

      console.log('Using API URL:', apiUrl)
      console.log('Using provider:', currentConfig.provider)

      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          "model": modelId,
          "messages": apiMessages,
          "max_tokens": settings.maxTokens,
          "temperature": settings.temperature,
          "stream": true,
          // Add PDF parsing configuration only for OpenRouter
          ...(currentConfig.provider === 'openrouter' && files && files.some(f => f.type === 'application/pdf' || f.name.endsWith('.pdf')) && {
            "plugins": [
              {
                "id": "file-parser",
                "pdf": {
                  "engine": "pdf-text" // Use pdf-text engine for better text extraction
                }
              }
            ]
          })
        })
      });

      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`${currentConfig.provider} API error:`, response.status, errorText)
        throw new Error(`${currentConfig.provider} API error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body reader available')
      }

      let fullResponse = ''
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('Stream reading completed. Full response length:', fullResponse.length)
          break
        }

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data.trim() === '[DONE]') {
              console.log('Received [DONE] signal')
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
