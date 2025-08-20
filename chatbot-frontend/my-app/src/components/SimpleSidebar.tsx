import React from 'react'
import { Box, Text, VStack, Button } from '@chakra-ui/react'
import { useChatStore, chatActions } from '../store/chatStore'

export const SimpleSidebar = () => {
  const { state, dispatch } = useChatStore()

  const handleClearChat = () => {
    dispatch(chatActions.clearMessages())
  }

  return (
    <Box
      w="300px"
      h="100vh"
      bg="white"
      _dark={{ bg: 'gray.800' }}
      borderRight="1px"
      borderColor="gray.200"
      _dark={{ borderColor: 'gray.700' }}
      p={4}
      overflowY="auto"
    >
      <VStack spacing={4} align="stretch">
        <Text fontSize="xl" fontWeight="bold" color="blue.500">
          🤖 AI Chatbot
        </Text>

        <Box>
          <Text fontSize="md" fontWeight="semibold" mb={2}>
            Chat Model
          </Text>
          <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
            {state.selectedChatModel || 'Qwen 3 8B'}
          </Text>
        </Box>

        <Box>
          <Text fontSize="md" fontWeight="semibold" mb={2}>
            Messages
          </Text>
          <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
            {state.messages.length} messages
          </Text>
        </Box>

        <Box>
          <Text fontSize="md" fontWeight="semibold" mb={2}>
            Settings
          </Text>
          <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
            Temperature: {state.settings.temperature}
          </Text>
          <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
            Max Tokens: {state.settings.maxTokens}
          </Text>
        </Box>

        <Button
          colorScheme="red"
          variant="outline"
          onClick={handleClearChat}
          size="sm"
        >
          Clear Chat
        </Button>
      </VStack>
    </Box>
  )
}
