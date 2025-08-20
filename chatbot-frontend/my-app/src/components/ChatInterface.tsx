import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Flex,
} from '@chakra-ui/react'
import { useChatStore, chatActions } from '../store/chatStore'
import { ChatAPI } from '../services/api'

export const ChatInterface = () => {
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

    // Add assistant message placeholder
    const assistantMessageId = Math.random().toString(36).substr(2, 9)
    dispatch(chatActions.addMessage({
      role: 'assistant',
      content: '',
    }))

    try {
      let assistantResponse = ''
      
      await ChatAPI.sendMessage(
        state.messages.concat([{ 
          id: 'temp', 
          role: 'user', 
          content: userMessage, 
          timestamp: new Date() 
        }]),
        state.selectedChatModel || 'qwen-8b',
        {
          maxTokens: state.settings.maxTokens,
          temperature: state.settings.temperature,
        },
        (chunk: string) => {
          assistantResponse += chunk
          // Update the last message with streaming content
          const lastMessage = state.messages[state.messages.length - 1]
          if (lastMessage && lastMessage.role === 'assistant') {
            dispatch(chatActions.updateMessage(lastMessage.id, assistantResponse))
          }
        }
      )
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
    <Flex direction="column" flex={1} h="100vh">
      {/* Messages Area */}
      <Box flex={1} overflowY="auto" p={4}>
        <VStack spacing={4} align="stretch">
          {state.messages.length === 0 ? (
            <Box textAlign="center" py={20}>
              <Text fontSize="lg" color="gray.500">
                Welcome! Start a conversation with the AI.
              </Text>
            </Box>
          ) : (
            state.messages.map((message) => (
              <Box
                key={message.id}
                alignSelf={message.role === 'user' ? 'flex-end' : 'flex-start'}
                maxW="80%"
              >
                <Box
                  bg={message.role === 'user' ? 'blue.500' : 'gray.100'}
                  color={message.role === 'user' ? 'white' : 'black'}
                  px={4}
                  py={2}
                  borderRadius="lg"
                  _dark={{
                    bg: message.role === 'user' ? 'blue.600' : 'gray.700',
                    color: message.role === 'user' ? 'white' : 'white',
                  }}
                >
                  <Text fontSize="sm" opacity={0.8} mb={1}>
                    {message.role === 'user' ? '👤 You' : '🤖 Assistant'}
                  </Text>
                  <Text whiteSpace="pre-wrap">{message.content}</Text>
                  <Text fontSize="xs" opacity={0.6} mt={1}>
                    {message.timestamp.toLocaleTimeString()}
                  </Text>
                </Box>
              </Box>
            ))
          )}
          <div ref={messagesEndRef} />
        </VStack>
      </Box>

      {/* Input Area */}
      <Box
        borderTop="1px"
        borderColor="gray.200"
        _dark={{ borderColor: 'gray.700' }}
        p={4}
        bg="white"
        _dark={{ bg: 'gray.800' }}
      >
        <HStack spacing={2}>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            flex={1}
          />
          <Button
            onClick={handleSendMessage}
            isLoading={isLoading}
            loadingText="Sending..."
            colorScheme="blue"
            disabled={!inputValue.trim()}
          >
            Send
          </Button>
        </HStack>
      </Box>
    </Flex>
  )
}
