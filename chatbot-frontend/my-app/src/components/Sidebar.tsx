import React, { useState } from 'react'
import { useChatStore, chatActions } from '../store/chatStore'

interface SidebarProps {
  onNewChat: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ onNewChat }) => {
  const { state, dispatch } = useChatStore()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string>('')

  const models = [
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
    { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
    { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'anthropic' },
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic' },
    { id: 'llama-2-70b', name: 'Llama 2 70B', provider: 'meta' },
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
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '2rem',
      paddingBottom: '1rem',
      borderBottom: '2px solid #f87171',
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
  }

  return (
    <div style={styles.sidebar}>
      <div style={styles.header}>
        <h1 style={styles.title}>🏢 Prudential AI</h1>
        <button
          style={styles.collapseButton}
          onClick={() => setIsCollapsed(!isCollapsed)}
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
  )
}
