import React, { useState } from 'react'
import { useChatStore, chatActions } from '../store/chatStore'

interface SidebarProps {
  onNewChat: () => void
  onCollapseChange?: (isCollapsed: boolean) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ onNewChat, onCollapseChange }) => {
  const { state, dispatch } = useChatStore()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string>('')
  
  // Mock conversation history - in a real app, this would come from your store/API
  const [conversationHistory] = useState([
    { id: '1', title: 'Prudential Insurance FAQ', date: '2 hours ago', preview: 'What are the benefits of...' },
    { id: '2', title: 'Policy Coverage Questions', date: 'Yesterday', preview: 'Can you explain the...' },
    { id: '3', title: 'Claims Process Help', date: '2 days ago', preview: 'How do I file a claim...' },
    { id: '4', title: 'Premium Calculation', date: '1 week ago', preview: 'What factors affect...' },
  ])

  const models = [
    { id: 'openai/gpt-oss-20b:free', name: 'GPT OSS 20B (Free)', provider: 'openai' },
    { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', provider: 'anthropic' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
    { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openai' },
    { id: 'meta-llama/llama-3.2-3b-instruct', name: 'Llama 3.2 3B', provider: 'meta' },
    { id: 'google/gemma-3-27b-it:free', name: 'Gemma 3 27B', provider: 'google' },
  ]

  const embeddingModels = [
    { id: 'text-embedding-ada-002', name: 'OpenAI Ada v2', provider: 'openai' },
    { id: 'text-embedding-3-small', name: 'OpenAI v3 Small', provider: 'openai' },
    { id: 'text-embedding-3-large', name: 'OpenAI v3 Large', provider: 'openai' },
  ]

  const handleModelChange = (modelId: string) => {
    dispatch(chatActions.setSelectedChatModel(modelId))
  }

  const handleEmbeddingModelChange = (modelId: string) => {
    dispatch(chatActions.setSelectedEmbedModel(modelId))
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadFile(file)
    setUploadStatus('Uploading...')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('embedding_model', state.selectedEmbedModel || embeddingModels[0].id)

      const response = await fetch('/api/upload-document', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        setUploadStatus(`Uploaded successfully! Document ID: ${result.document_id}`)
        setTimeout(() => {
          setUploadStatus('')
          setUploadFile(null)
        }, 3000)
      } else {
        throw new Error('Upload failed')
      }
    } catch (error) {
      setUploadStatus('Upload failed. Please try again.')
      console.error('Upload error:', error)
    }
  }

  const handleNewChat = () => {
    dispatch(chatActions.clearMessages())
    onNewChat()
  }

  const sidebarWidth = isCollapsed ? '60px' : '300px'

  const styles = {
    sidebar: {
      width: sidebarWidth,
      height: '100vh',
      backgroundColor: '#dc2626', // Prudential red
      color: 'white',
      padding: isCollapsed ? '1rem 0.5rem' : '1.5rem',
      borderRight: '3px solid #b91c1c',
      transition: 'width 0.3s ease',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column' as const,
      background: 'linear-gradient(180deg, #dc2626 0%, #b91c1c 100%)',
      boxShadow: '4px 0 12px rgba(220, 38, 38, 0.3)',
      position: 'fixed' as const,
      top: 0,
      left: 0,
      zIndex: 10,
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '2rem',
      paddingBottom: '1rem',
      borderBottom: '2px solid #f87171',
      flexShrink: 0, // Prevent header from shrinking
    },
    content: {
      flex: 1,
      overflowY: 'auto' as const,
      overflowX: 'hidden' as const,
      paddingRight: '0.25rem', // Reduced space for scrollbar
      maxWidth: '100%', // Prevent horizontal overflow
    },
    footer: {
      marginTop: 'auto',
      flexShrink: 0, // Prevent footer from shrinking
      paddingTop: '1rem',
      borderTop: '2px solid #f87171',
    },
    title: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      display: isCollapsed ? 'none' : 'block',
      color: 'white',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
    },
    collapseButton: {
      background: 'linear-gradient(135deg, #ffffff 0%, #fecaca 100%)',
      border: '2px solid #white',
      color: '#dc2626',
      cursor: 'pointer',
      padding: '0.5rem',
      borderRadius: '50%',
      fontSize: '1rem',
      fontWeight: 'bold',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
    },
    section: {
      marginBottom: '2rem',
    },
    sectionTitle: {
      fontSize: '0.875rem',
      fontWeight: '700',
      color: '#fecaca',
      marginBottom: '0.75rem',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.1em',
      display: isCollapsed ? 'none' : 'block',
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
    },
    select: {
      width: '100%',
      padding: '0.75rem',
      backgroundColor: '#ffffff',
      color: '#1f2937',
      border: '2px solid #fecaca',
      borderRadius: '0.75rem',
      fontSize: '0.875rem',
      cursor: 'pointer',
      display: isCollapsed ? 'none' : 'block',
      fontWeight: '600',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
    },
    fileUpload: {
      display: isCollapsed ? 'none' : 'block',
    },
    fileInput: {
      width: '100%',
      padding: '0.75rem',
      backgroundColor: '#ffffff',
      color: '#1f2937',
      border: '2px solid #fecaca',
      borderRadius: '0.75rem',
      fontSize: '0.875rem',
      cursor: 'pointer',
      marginBottom: '0.5rem',
      fontWeight: '600',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
    },
    uploadStatus: {
      fontSize: '0.75rem',
      color: uploadStatus.includes('successfully') ? '#dcfce7' : 
             uploadStatus.includes('failed') ? '#fecaca' : '#fecaca',
      marginTop: '0.5rem',
      fontWeight: '600',
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
    },
    newChatButton: {
      width: '100%',
      padding: isCollapsed ? '0.75rem' : '1rem',
      backgroundColor: '#ffffff',
      color: '#dc2626',
      border: '2px solid #fecaca',
      borderRadius: '0.75rem',
      fontSize: '0.875rem',
      fontWeight: '700',
      cursor: 'pointer',
      marginTop: 'auto',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
    iconOnly: {
      display: isCollapsed ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.5rem',
      marginBottom: '1.5rem',
      cursor: 'pointer',
      padding: '0.75rem',
      borderRadius: '50%',
      backgroundColor: '#ffffff',
      color: '#dc2626',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
      transition: 'all 0.3s ease',
    },
    conversationHistory: {
      marginTop: '1rem',
    },
    conversationItem: {
      padding: '0.75rem',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '0.5rem',
      marginBottom: '0.5rem',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      display: isCollapsed ? 'none' : 'block',
    },
    conversationTitle: {
      fontSize: '0.8rem',
      fontWeight: '600',
      color: 'white',
      marginBottom: '0.25rem',
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      whiteSpace: 'nowrap' as const,
    },
    conversationMeta: {
      fontSize: '0.7rem',
      color: '#fecaca',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    conversationPreview: {
      fontSize: '0.7rem',
      color: '#fecaca',
      marginTop: '0.25rem',
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      whiteSpace: 'nowrap' as const,
    },
  }

  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>
        <h1 style={styles.title}>Prudential AI</h1>
        <button
          style={styles.collapseButton}
          onClick={() => {
            const newCollapsedState = !isCollapsed
            setIsCollapsed(newCollapsedState)
            onCollapseChange?.(newCollapsedState)
          }}
          title={isCollapsed ? 'Expand' : 'Collapse'}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)'
            e.currentTarget.style.backgroundColor = '#fecaca'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.backgroundColor = '#ffffff'
          }}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      <div style={styles.content} className="sidebar-content">
        {/* Chat Model Selection */}
        <div style={styles.section}>
        <div style={styles.sectionTitle}>Chat Model</div>
        <div 
          style={styles.iconOnly} 
          title="Chat Model"
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)'
            e.currentTarget.style.backgroundColor = '#fecaca'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.backgroundColor = '#ffffff'
          }}
        >
          🤖
        </div>
        <select
          style={styles.select}
          value={state.selectedChatModel || ''}
          onChange={(e) => handleModelChange(e.target.value)}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = '#dc2626'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.1)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = '#fecaca'
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.1)'
          }}
        >
          <option value="">Select Model</option>
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </div>

      {/* Embedding Model Selection */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Embedding Model</div>
        <div 
          style={styles.iconOnly} 
          title="Embedding Model"
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)'
            e.currentTarget.style.backgroundColor = '#fecaca'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.backgroundColor = '#ffffff'
          }}
        >
          🔗
        </div>
        <select
          style={styles.select}
          value={state.selectedEmbedModel || ''}
          onChange={(e) => handleEmbeddingModelChange(e.target.value)}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = '#dc2626'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.1)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = '#fecaca'
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.1)'
          }}
        >
          <option value="">Select Embedding Model</option>
          {embeddingModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </div>

      {/* Document Upload */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Upload Document</div>
        <div 
          style={styles.iconOnly} 
          title="Upload Document"
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)'
            e.currentTarget.style.backgroundColor = '#fecaca'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.backgroundColor = '#ffffff'
          }}
        >
          📄
        </div>
        <div style={styles.fileUpload}>
          <input
            type="file"
            accept=".pdf,.txt,.md,.docx"
            onChange={handleFileUpload}
            style={styles.fileInput}
          />
          {uploadStatus && (
            <div style={styles.uploadStatus}>
              {uploadStatus}
            </div>
          )}
          {uploadFile && (
            <div style={{ fontSize: '0.75rem', color: '#fecaca', marginTop: '0.25rem', fontWeight: '600' }}>
              Selected: {uploadFile.name}
            </div>
          )}
        </div>
      </div>

      {/* New Chat Button */}
      <div style={styles.section}>
        <button
          style={styles.newChatButton}
          onClick={handleNewChat}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#fecaca'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.3)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)'
          }}
          title="Start New Chat"
        >
          {isCollapsed ? '+' : '+ New Chat'}
        </button>
      </div>

      {/* Conversation History */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Recent Chats</div>
        <div style={styles.conversationHistory}>
          {conversationHistory.map((conversation) => (
            <div
              key={conversation.id}
              style={styles.conversationItem}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
                e.currentTarget.style.transform = 'translateX(4px)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                e.currentTarget.style.transform = 'translateX(0px)'
              }}
              onClick={() => {
                // TODO: Load conversation by ID
                console.log('Load conversation:', conversation.id)
              }}
              title={`Load conversation: ${conversation.title}`}
            >
              <div style={styles.conversationTitle}>
                {conversation.title}
              </div>
              <div style={styles.conversationMeta}>
                <span>📄</span>
                <span>{conversation.date}</span>
              </div>
              <div style={styles.conversationPreview}>
                {conversation.preview}
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
      
      <div style={styles.footer}>
      </div>
    </div>
  )
}
