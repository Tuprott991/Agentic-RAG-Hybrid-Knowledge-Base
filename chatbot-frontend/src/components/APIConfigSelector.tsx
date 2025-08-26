import React, { useState } from 'react'
import { ChatAPI } from '../services/api'

const APIConfigSelector: React.FC = () => {
  const [currentProvider, setCurrentProvider] = useState(ChatAPI.getCurrentConfig().provider)
  const [customUrl, setCustomUrl] = useState('')
  const [customApiKey, setCustomApiKey] = useState('')

  const handleProviderChange = (provider: 'openrouter' | 'self-hosted') => {
    if (provider === 'openrouter') {
      ChatAPI.setOpenRouterProvider()
    } else {
      if (customUrl && customApiKey) {
        ChatAPI.setSelfHostedProvider(customUrl, customApiKey)
      } else {
        ChatAPI.setSelfHostedProvider()
      }
    }
    setCurrentProvider(provider)
  }

  return (
    <div className="api-config-selector p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">API Configuration</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Provider
          </label>
          <select 
            value={currentProvider} 
            onChange={(e) => handleProviderChange(e.target.value as 'openrouter' | 'self-hosted')}
            className="w-full p-2 border rounded"
          >
            <option value="openrouter">OpenRouter</option>
            <option value="self-hosted">Self-Hosted (ngrok)</option>
          </select>
        </div>

        {currentProvider === 'self-hosted' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">
                Base URL (optional)
              </label>
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://your-ngrok-url.ngrok-free.app"
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                API Key (optional)
              </label>
              <input
                type="password"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder="your-api-key"
                className="w-full p-2 border rounded"
              />
            </div>

            <button
              onClick={() => handleProviderChange('self-hosted')}
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              Update Self-Hosted Configuration
            </button>
          </>
        )}

        <div className="mt-4 p-3 bg-gray-100 rounded">
          <p className="text-sm">
            <strong>Current:</strong> {ChatAPI.getCurrentConfig().provider}
          </p>
          <p className="text-sm">
            <strong>URL:</strong> {ChatAPI.getCurrentConfig().baseUrl}
          </p>
        </div>
      </div>
    </div>
  )
}

export default APIConfigSelector
