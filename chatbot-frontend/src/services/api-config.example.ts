// Example of how to use the flexible API configuration

import { ChatAPI } from './api'

// Example 1: Using OpenRouter (default)
ChatAPI.setOpenRouterProvider()

// Example 2: Using self-hosted with default configuration
ChatAPI.setSelfHostedProvider()

// Example 3: Using self-hosted with custom ngrok URL
ChatAPI.setSelfHostedProvider('https://e0e11edb7719.ngrok-free.app')

// Example 4: Using self-hosted with custom URL and API key
ChatAPI.setSelfHostedProvider('https://your-ngrok-url.ngrok-free.app', 'your-custom-api-key')

// Example 5: Using custom configuration
ChatAPI.setConfiguration({
  provider: 'self-hosted',
  baseUrl: 'https://your-custom-endpoint.com/v1',
  apiKey: 'your-api-key',
  headers: {
    'Custom-Header': 'custom-value'
  }
})

// Check current configuration
const currentConfig = ChatAPI.getCurrentConfig()
console.log('Current API provider:', currentConfig.provider)
console.log('Current base URL:', currentConfig.baseUrl)

// Usage in components:
// Just call ChatAPI.sendMessage() as usual - it will use the configured endpoint

// Switch between providers at runtime:
export const switchToSelfHosted = () => {
  ChatAPI.setSelfHostedProvider('https://your-ngrok-url.ngrok-free.app/v1', 'your-api-key')
}

export const switchToOpenRouter = () => {
  ChatAPI.setOpenRouterProvider()
}
