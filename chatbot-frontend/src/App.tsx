import { useReducer, useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatContext, chatReducer, initialState } from './store/chatStore'
import { Sidebar } from './components/Sidebar'
import { SimpleChat } from './components/SimpleChat'
import { ChatAPI } from './services/api'

const queryClient = new QueryClient()

function App() {
  const [state, dispatch] = useReducer(chatReducer, initialState)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Switch to self-hosted API on app startup
  useEffect(() => {
    // Uncomment the line below to use your self-hosted endpoint
    // ChatAPI.setSelfHostedProvider('https://c533d212d673.ngrok-free.app')
    
    // Or use with custom API key:
    // ChatAPI.setSelfHostedProvider('https://c533d212d673.ngrok-free.app', 'your-api-key')
    
    console.log('Current API config:', ChatAPI.getCurrentConfig())
  }, [])

  const handleNewChat = () => {
    // This will be handled by the Sidebar component
    console.log('New chat initiated')
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ChatContext.Provider value={{ state, dispatch }}>
        <div style={{ 
          display: 'flex', 
          height: '100vh',
          background: 'linear-gradient(135deg, #ffffff 0%, #fef7f7 100%)',
          overflow: 'hidden'
        }}>
          <Sidebar 
            onNewChat={handleNewChat} 
            onCollapseChange={setIsSidebarCollapsed}
          />
          <div style={{ 
            flex: 1,
            height: '100vh',
            overflow: 'hidden',
            marginLeft: isSidebarCollapsed ? '60px' : '320px', // Dynamic margin based on sidebar state
            transition: 'margin-left 0.3s ease' // Smooth transition
          }}>
            <SimpleChat />
          </div>
        </div>
      </ChatContext.Provider>
    </QueryClientProvider>
  )
}

export default App
