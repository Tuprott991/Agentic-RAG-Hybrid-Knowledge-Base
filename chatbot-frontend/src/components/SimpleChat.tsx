import React, { useState, useCallback, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useChatStore, chatActions } from '../store/chatStore'
import { ChatAPI } from '../services/api'

const styles = {
  container: {
    height: '100vh',
    width: '100%',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  chatArea: {
    flex: 1,
    width: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: '#ffffff',
    height: '100%',
    overflow: 'hidden',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
    background: 'linear-gradient(135deg, #ffffff 0%, #fef7f7 100%)',
    height: '0', // This forces the flex child to respect the parent's height
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
    backgroundColor: '#ffffff',
    background: 'linear-gradient(90deg, #ffffff 0%, #fef7f7 100%)',
    width: '100%',
    boxSizing: 'border-box' as const,
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
  markdownContent: {
    lineHeight: '1.6',
    fontSize: '1rem',
  },
  // Markdown-specific styles
  markdownH1: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginTop: '1rem',
    marginBottom: '0.5rem',
    borderBottom: '2px solid #fee2e2',
    paddingBottom: '0.25rem',
  },
  markdownH2: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    marginTop: '0.75rem',
    marginBottom: '0.5rem',
  },
  markdownH3: {
    fontSize: '1.125rem',
    fontWeight: 'bold',
    marginTop: '0.5rem',
    marginBottom: '0.25rem',
  },
  markdownCode: {
    backgroundColor: '#f3f4f6',
    padding: '0.125rem 0.25rem',
    borderRadius: '0.25rem',
    fontSize: '0.875rem',
    fontFamily: 'monaco, consolas, monospace',
    border: '1px solid #e5e7eb',
  },
  markdownCodeBlock: {
    backgroundColor: '#f8f9fa',
    padding: '1rem',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontFamily: 'monaco, consolas, monospace',
    overflow: 'auto',
    border: '1px solid #e5e7eb',
    margin: '0.5rem 0',
  },
  markdownBlockquote: {
    borderLeft: '4px solid #dc2626',
    paddingLeft: '1rem',
    margin: '0.5rem 0',
    fontStyle: 'italic',
    backgroundColor: '#fef7f7',
    padding: '0.5rem 1rem',
    borderRadius: '0 0.25rem 0.25rem 0',
  },
  markdownList: {
    paddingLeft: '1.5rem',
    margin: '0.5rem 0',
  },
  markdownListItem: {
    marginBottom: '0.25rem',
  },
  markdownTable: {
    borderCollapse: 'collapse' as const,
    width: '100%',
    margin: '0.5rem 0',
    fontSize: '0.875rem',
  },
  markdownTh: {
    border: '1px solid #e5e7eb',
    padding: '0.5rem',
    backgroundColor: '#f9fafb',
    fontWeight: 'bold',
    textAlign: 'left' as const,
  },
  markdownTd: {
    border: '1px solid #e5e7eb',
    padding: '0.5rem',
  },
  // File upload styles
  inputSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    width: '100%',
  },
  attachmentsContainer: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  thumbnailContainer: {
    position: 'relative' as const,
    display: 'inline-block',
  },
  thumbnail: {
    width: '60px',
    height: '60px',
    borderRadius: '0.5rem',
    border: '2px solid #fecaca',
    objectFit: 'cover' as const,
    backgroundColor: '#ffffff',
  },
  fileThumbnail: {
    width: '60px',
    height: '60px',
    borderRadius: '0.5rem',
    border: '2px solid #fecaca',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#dc2626',
    textAlign: 'center' as const,
    flexDirection: 'column' as const,
    padding: '0.25rem',
  },
  removeButton: {
    position: 'absolute' as const,
    top: '-8px',
    right: '-8px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
  },
  inputRow: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-end',
    width: '100%',
  },
  fileInputButton: {
    padding: '1rem',
    backgroundColor: '#ffffff',
    color: '#dc2626',
    border: '2px solid #fecaca',
    borderRadius: '2rem',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '50px',
  },
  hiddenFileInput: {
    display: 'none',
  },
}

export const SimpleChat: React.FC = () => {
  const { state, dispatch } = useChatStore()
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const streamingMessageId = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // File handling functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newFiles = Array.from(files)
      setAttachedFiles(prev => [...prev, ...newFiles])
      // Reset the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const getFileIcon = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'pdf': return '📄'
      case 'doc': case 'docx': return '📝'
      case 'txt': case 'md': return '📃'
      case 'jpg': case 'jpeg': case 'png': case 'gif': case 'webp': return null // We'll show the actual image
      default: return '📎'
    }
  }

  const isImageFile = (file: File) => {
    return file.type.startsWith('image/')
  }

  const handleSendMessage = useCallback(async () => {
    if ((!inputValue.trim() && attachedFiles.length === 0) || isLoading) return

    const userMessage = inputValue.trim()
    const filesToUpload = attachedFiles.length > 0 ? [...attachedFiles] : undefined
    
    setInputValue('')
    setAttachedFiles([]) // Clear attached files after sending
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
      const assistantMessageId = Math.random().toString(36).substr(2, 9)
      streamingMessageId.current = assistantMessageId
      
      dispatch(chatActions.addMessageWithId({
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }))

      await ChatAPI.sendMessage(
        currentMessages,
        state.selectedChatModel || 'openai/gpt-oss-20b:free',
        {
          maxTokens: state.settings.maxTokens,
          temperature: state.settings.temperature,
        },
        (chunk: string) => {
          assistantResponse += chunk
          
          // Update the message using the stored ID
          if (streamingMessageId.current) {
            dispatch(chatActions.updateMessage(streamingMessageId.current, assistantResponse))
          }
        },
        filesToUpload // Pass the files to the API
      )

      console.log('Chat completed successfully')
    } catch (error) {
      console.error('Chat error:', error)
      // Update the existing assistant message with error instead of adding new one
      if (streamingMessageId.current) {
        dispatch(chatActions.updateMessage(streamingMessageId.current, 'Sorry, I encountered an error. Please try again.'))
      }
    } finally {
      setIsLoading(false)
      streamingMessageId.current = null // Clear the ref
    }
  }, [inputValue, isLoading, attachedFiles, state.messages, state.selectedChatModel, state.settings, dispatch])

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
              <div style={styles.welcomeIcon}>🏢</div>
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
                  <div style={styles.markdownContent}>
                    {message.role === 'user' ? (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
                    ) : (
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    )}
                  </div>
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
          <div style={styles.inputSection}>
            {/* File thumbnails */}
            {attachedFiles.length > 0 && (
              <div style={styles.attachmentsContainer}>
                {attachedFiles.map((file, index) => (
                  <div key={index} style={styles.thumbnailContainer}>
                    {isImageFile(file) ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        style={styles.thumbnail}
                      />
                    ) : (
                      <div style={styles.fileThumbnail}>
                        <div style={{ fontSize: '1.5rem' }}>{getFileIcon(file)}</div>
                        <div style={{ fontSize: '0.65rem', marginTop: '2px' }}>
                          {file.name.split('.').pop()?.toUpperCase()}
                        </div>
                      </div>
                    )}
                    <button
                      style={styles.removeButton}
                      onClick={() => removeFile(index)}
                      title="Remove file"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Input row */}
            <div style={styles.inputRow}>
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
              
              {/* File upload button */}
              <button
                style={styles.fileInputButton}
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                title="Attach files or images"
                onMouseOver={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#fef7f7'
                    e.currentTarget.style.borderColor = '#dc2626'
                  }
                }}
                onMouseOut={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#ffffff'
                    e.currentTarget.style.borderColor = '#fecaca'
                  }
                }}
              >
                📎
              </button>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt,.md"
                onChange={handleFileSelect}
                style={styles.hiddenFileInput}
              />
              
              <button
                style={{
                  ...styles.button,
                  ...((!inputValue.trim() && attachedFiles.length === 0) || isLoading ? styles.buttonDisabled : {}),
                }}
                onClick={handleSendMessage}
                disabled={(!inputValue.trim() && attachedFiles.length === 0) || isLoading}
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
      </div>
    </div>
  )
}
