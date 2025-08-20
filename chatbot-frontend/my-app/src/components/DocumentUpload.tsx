import React, { useCallback } from 'react'
import {
  Box,
  Button,
  Text,
  VStack,
  Progress,
  useToast,
  Flex,
  IconButton,
} from '@chakra-ui/react'
import { DeleteIcon } from '@chakra-ui/icons'
import { useChatStore, chatActions } from '../store/chatStore'
import { ChatAPI } from '../services/api'
import type { Document } from '../types'

export const DocumentUpload = () => {
  const { state, dispatch } = useChatStore()
  const toast = useToast()
  const [uploading, setUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    setUploading(true)

    try {
      const document = await ChatAPI.uploadDocument(file)
      dispatch(chatActions.addDocument(document))
      toast({
        title: 'Document uploaded successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [dispatch, toast])

  const handleDeleteDocument = useCallback(async (documentId: string) => {
    try {
      await ChatAPI.deleteDocument(documentId)
      dispatch(chatActions.removeDocument(documentId))
      toast({
        title: 'Document deleted',
        status: 'success',
        duration: 2000,
        isClosable: true,
      })
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }, [dispatch, toast])

  return (
    <VStack spacing={3} align="stretch">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        accept=".pdf,.txt,.md,.doc,.docx"
      />
      
      <Button
        onClick={() => fileInputRef.current?.click()}
        isLoading={uploading}
        loadingText="Uploading..."
        size="sm"
        colorScheme="brand"
      >
        Upload Document
      </Button>

      {uploading && (
        <Progress size="sm" isIndeterminate colorScheme="brand" />
      )}

      {state.documents.length > 0 && (
        <Box>
          <Text fontSize="sm" fontWeight="semibold" mb={2}>
            Uploaded Documents ({state.documents.length})
          </Text>
          <VStack spacing={2} align="stretch">
            {state.documents.map((doc) => (
              <Flex
                key={doc.id}
                align="center"
                justify="space-between"
                p={2}
                bg="gray.50"
                _dark={{ bg: 'gray.700' }}
                borderRadius="md"
                fontSize="sm"
              >
                <Box flex={1} mr={2}>
                  <Text fontWeight="medium" noOfLines={1}>
                    {doc.name}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {(doc.size / 1024).toFixed(1)} KB
                  </Text>
                </Box>
                <IconButton
                  aria-label="Delete document"
                  icon={<DeleteIcon />}
                  size="xs"
                  colorScheme="red"
                  variant="ghost"
                  onClick={() => handleDeleteDocument(doc.id)}
                />
              </Flex>
            ))}
          </VStack>
        </Box>
      )}
    </VStack>
  )
}
