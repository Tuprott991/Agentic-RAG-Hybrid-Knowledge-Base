import { useReducer } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatContext, chatReducer, initialState } from './store/chatStore'
import { Sidebar } from './components/Sidebar'
import { SimpleChat } from './components/SimpleChat'

const queryClient = new QueryClient()

function App() {
  const [state, dispatch] = useReducer(chatReducer, initialState)

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
          background: 'linear-gradient(135deg, #ffffff 0%, #fef7f7 100%)'
        }}>
          <Sidebar onNewChat={handleNewChat} />
          <div style={{ flex: 1 }}>
            <SimpleChat />
          </div>
        </div>
      </ChatContext.Provider>
    </QueryClientProvider>
  )
}

export default App
