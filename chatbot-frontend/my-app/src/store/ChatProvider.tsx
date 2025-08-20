import { useReducer, type ReactNode } from 'react'
import { ChatContext, chatReducer, initialState } from './chatStore'

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState)

  return (
    <ChatContext.Provider value={{ state, dispatch }}>
      {children}
    </ChatContext.Provider>
  )
}
