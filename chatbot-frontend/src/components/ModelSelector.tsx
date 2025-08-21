import React from 'react'
import {
  Box,
  Text,
  Button,
  Select,
  VStack,
  HStack,
  Input,
} from '@chakra-ui/react'
import { useChatStore, chatActions } from '../store/chatStore'

export const ModelSelector = () => {
  const { state, dispatch } = useChatStore()

  return (
    <Box>
      <Text fontSize="lg" fontWeight="semibold" mb={3}>
        Models
      </Text>
      <VStack spacing={3}>
        <Box w="100%">
          <Text fontSize="sm" mb={1}>Chat Model</Text>
          <Select
            value={state.selectedChatModel || ''}
            onChange={(e) => dispatch(chatActions.setSelectedChatModel(e.target.value))}
            size="sm"
          >
            {state.chatModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </Select>
        </Box>
        
        <Box w="100%">
          <Text fontSize="sm" mb={1}>Embed Model</Text>
          <Select
            value={state.selectedEmbedModel || ''}
            onChange={(e) => dispatch(chatActions.setSelectedEmbedModel(e.target.value))}
            size="sm"
          >
            {state.embedModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </Select>
        </Box>
      </VStack>
    </Box>
  )
}
