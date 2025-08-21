import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useChatStore, chatActions } from '../store/chatStore'
import { ChatAPI } from '../services/api'

const styles = {
  container: {
    height: '100vh',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: '#ffffff',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
    background: 'linear-gradient(135deg, #ffffff 0%, #fef7f7 100%)',
  },
  messageWrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  userMessage: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    backgroundColor: '#dc2626', // Prudential red
    color: 'white',
    padding: '1rem 1.5rem',
    borderRadius: '1.5rem 1.5rem 0.5rem 1.5rem',
    marginBottom: '0.5rem',
    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
    position: 'relative' as const,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    maxWidth: '80%',
    backgroundColor: '#ffffff',
    color: '#1f2937',
    padding: '1rem 1.5rem',
    borderRadius: '1.5rem 1.5rem 1.5rem 0.5rem',
    marginBottom: '0.5rem',
    border: '2px solid #fee2e2',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    position: 'relative' as const,
  },
  inputContainer: {
    padding: '1.5rem 2rem',
    borderTop: '2px solid #fee2e2',
    display: 'flex',
    gap: '1rem',
    backgroundColor: '#ffffff',
    background: 'linear-gradient(90deg, #ffffff 0%, #fef7f7 100%)',
  },
  input: {
    flex: 1,
    padding: '1rem 1.5rem',
    border: '2px solid #fecaca',
    borderRadius: '2rem',
    fontSize: '1rem',
    outline: 'none',
    backgroundColor: '#ffffff',
    transition: 'all 0.3s ease',
  },
  button: {
    padding: '1rem 2rem',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '2rem',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
  },
  buttonDisabled: {
    backgroundColor: '#fca5a5',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    fontSize: '1.25rem',
    color: '#9ca3af',
    textAlign: 'center' as const,
    flexDirection: 'column' as const,
  },
  messageHeader: {
    fontSize: '0.75rem',
    opacity: 0.8,
    marginBottom: '0.5rem',
    fontWeight: '600',
  },
  messageTime: {
    fontSize: '0.75rem',
    opacity: 0.6,
    marginTop: '0.5rem',
  },
  welcomeIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
    color: '#dc2626',
  },
  welcomeText: {
    color: '#374151',
    fontSize: '1.125rem',
    marginBottom: '0.5rem',
    fontWeight: '600',
  },
  welcomeSubtext: {
    color: '#6b7280',
    fontSize: '1rem',
  },
}

export const SimpleChat: React.FC = () => {
  const { state, dispatch } = useChatStore()
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [state.messages])

  // Initialize with default models
  useEffect(() => {
    const initializeModels = async () => {
      try {
        const [chatModels, embedModels] = await Promise.all([
          ChatAPI.getChatModels(),
          ChatAPI.getEmbedModels(),
        ])
        
        dispatch(chatActions.setChatModels(chatModels))
        dispatch(chatActions.setEmbedModels(embedModels))
        
        if (chatModels.length > 0 && !state.selectedChatModel) {
          dispatch(chatActions.setSelectedChatModel(chatModels[0].id))
        }
        if (embedModels.length > 0 && !state.selectedEmbedModel) {
          dispatch(chatActions.setSelectedEmbedModel(embedModels[0].id))
        }
      } catch (error) {
        console.error('Failed to load models:', error)
      }
    }

    initializeModels()
  }, [dispatch, state.selectedChatModel, state.selectedEmbedModel])

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue('')
    setIsLoading(true)

    // Add user message
    dispatch(chatActions.addMessage({
      role: 'user',
      content: userMessage,
    }))

    try {
      let assistantResponse = ''
      const currentMessages = [...state.messages, {
        id: 'temp',
        role: 'user' as const,
        content: userMessage,
        timestamp: new Date(),
      }]

      // Add empty assistant message to show streaming
      dispatch(chatActions.addMessage({
        role: 'assistant',
        content: '',
      }))

      await ChatAPI.sendMessage(
        currentMessages,
        state.selectedChatModel || 'qwen-8b',
        {
          maxTokens: state.settings.maxTokens,
          temperature: state.settings.temperature,
        },
        (chunk: string) => {
          assistantResponse += chunk
          // Find the last assistant message and update it
          const lastMessageIndex = state.messages.length
          if (lastMessageIndex >= 0) {
            const lastMessage = state.messages[lastMessageIndex]
            if (lastMessage && lastMessage.role === 'assistant') {
              dispatch(chatActions.updateMessage(lastMessage.id, assistantResponse))
            }
          }
        }
      )

      // Update the assistant message with final response
      const finalMessages = [...state.messages]
      const lastAssistantMessage = finalMessages[finalMessages.length - 1]
      if (lastAssistantMessage && lastAssistantMessage.role === 'assistant') {
        dispatch(chatActions.updateMessage(lastAssistantMessage.id, assistantResponse))
      }
    } catch (error) {
      console.error('Chat error:', error)
      dispatch(chatActions.addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      }))
    } finally {
      setIsLoading(false)
    }
  }, [inputValue, isLoading, state.messages, state.selectedChatModel, state.settings, dispatch])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.chatArea}>
        <div style={styles.messagesContainer}>
          {state.messages.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.welcomeIcon}></div>
              <div style={styles.welcomeText}>Welcome to Prudential AI Assistant</div>
              <div style={styles.welcomeSubtext}>Start a conversation to get help with your questions</div>
            </div>
          ) : (
            state.messages.map((message) => (
              <div key={message.id} style={styles.messageWrapper}>
                <div
                  style={
                    message.role === 'user'
                      ? styles.userMessage
                      : styles.assistantMessage
                  }
                >
                  <div style={styles.messageHeader}>
                    {message.role === 'user' ? '👤 You' : '🤖 Prudential Assistant'}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
                  <div style={styles.messageTime}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={styles.inputContainer}>
          <input
            style={styles.input}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about insurance, policies, or get assistance..."
            disabled={isLoading}
            onFocus={(e) => {
              e.target.style.borderColor = '#dc2626'
              e.target.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.1)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#fecaca'
              e.target.style.boxShadow = 'none'
            }}
          />
          <button
            style={{
              ...styles.button,
              ...((!inputValue.trim() || isLoading) ? styles.buttonDisabled : {}),
            }}
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            onMouseOver={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = '#b91c1c'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }
            }}
            onMouseOut={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = '#dc2626'
                e.currentTarget.style.transform = 'translateY(0)'
              }
            }}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
