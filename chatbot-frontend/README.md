# Modern AI Chatbot Frontend

A fully-featured, modern React-based chatbot frontend with streaming chat capabilities, model selection, and document upload functionality.

## 🚀 Features

### ✨ Core Features
- **Streaming Chat Interface**: Real-time message streaming for smooth conversation flow
- **Model Selection**: Choose from multiple AI models (GPT, Claude, LLaMA, etc.)
- **Embedding Model Selection**: Select embedding models for document processing
- **Document Upload**: Upload and inject documents into the knowledge base
- **Collapsible Sidebar**: Space-efficient design with expandable controls
- **Modern UI/UX**: Clean, responsive design with smooth animations

### 🎨 UI/UX Highlights
- **Dark Sidebar Theme**: Professional dark theme for controls
- **Responsive Layout**: Adapts to different screen sizes
- **Message Bubbles**: Distinct styling for user and assistant messages
- **Status Indicators**: Real-time feedback for uploads and processing
- **Keyboard Shortcuts**: Enter to send messages, intuitive navigation

### 🔧 Technical Features
- **TypeScript**: Full type safety and better development experience
- **Context-based State Management**: Efficient state handling with React Context
- **Modular Architecture**: Well-organized component structure
- **API Integration**: Ready for backend integration with streaming support
- **Error Handling**: Comprehensive error management and user feedback

## 🏗️ Architecture

### Component Structure
```
src/
├── components/
│   ├── Sidebar.tsx           # Main sidebar with model selection and upload
│   ├── SimpleChat.tsx        # Chat interface with streaming support
│   └── ...
├── store/
│   └── chatStore.ts          # Context-based state management
├── services/
│   └── api.ts               # API service layer
├── types/
│   └── index.ts             # TypeScript type definitions
└── App.tsx                  # Main application component
```

### State Management
- **React Context + useReducer**: Centralized state management
- **Actions**: Clear action patterns for state updates
- **Type Safety**: Full TypeScript coverage for state and actions

### API Integration
- **Streaming Support**: Real-time message streaming
- **Model Management**: Dynamic model loading and selection
- **Document Upload**: File upload with progress tracking
- **Error Handling**: Comprehensive API error management

## 🚀 Getting Started

### Prerequisites
- Node.js 20.19+ or 22.12+
- npm or yarn package manager

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Development
```bash
# Start development server with hot reload
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🔧 Configuration

### API Endpoints
Configure the backend API endpoints in `src/services/api.ts`:

```typescript
const API_BASE_URL = 'http://localhost:8000' // Update this to your backend URL
```

### Models
Update available models in `src/components/Sidebar.tsx`:

```typescript
const models = [
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
  { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
  // Add your models here
]
```

## 📱 Usage

### Chat Interface
1. **Select a Model**: Choose your preferred AI model from the sidebar
2. **Optional: Select Embedding Model**: Choose embedding model for RAG
3. **Optional: Upload Documents**: Upload PDFs, text files, or Word documents
4. **Start Chatting**: Type your message and press Enter or click Send
5. **View Responses**: Watch real-time streaming responses from the AI

### Sidebar Features
- **Collapse/Expand**: Click the arrow button to toggle sidebar
- **Model Selection**: Dropdown to choose chat and embedding models
- **Document Upload**: Drag & drop or click to upload files
- **New Chat**: Clear conversation and start fresh

## 🎨 Customization

### Styling
The application uses CSS-in-JS for styling. Key style objects:

- **Sidebar**: Dark theme with blue accents
- **Chat**: Clean white theme with message bubbles
- **Colors**: Consistent color scheme throughout

### Themes
You can customize the color scheme by updating the style objects in each component:

```typescript
const styles = {
  sidebar: {
    backgroundColor: '#1a202c', // Dark blue-gray
    color: 'white',
    // ... more styles
  }
}
```

## 🔌 Backend Integration

### Expected API Endpoints

#### Chat Completion (Streaming)
```
POST /api/chat/completions
Content-Type: application/json

{
  "messages": [...],
  "model": "gpt-3.5-turbo",
  "stream": true,
  "max_tokens": 2048,
  "temperature": 0.7
}
```

#### Document Upload
```
POST /api/upload-document
Content-Type: multipart/form-data

file: [File]
embedding_model: "text-embedding-ada-002"
```

#### Model Lists
```
GET /api/models/chat      # Returns available chat models
GET /api/models/embed     # Returns available embedding models
```

## 🧪 Testing

### Manual Testing
1. **Start the development server**: `npm run dev`
2. **Open browser**: Navigate to `http://localhost:5173`
3. **Test chat functionality**: Send messages and verify responses
4. **Test model selection**: Switch between different models
5. **Test document upload**: Upload various file types
6. **Test responsive design**: Resize browser window

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

This creates a `dist/` folder with optimized static files ready for deployment.

### Deploy to Static Hosting
The built files can be deployed to any static hosting service:
- Vercel, Netlify, GitHub Pages, AWS S3 + CloudFront, or any web server

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 🆘 Troubleshooting

### Common Issues

#### Import Errors
If you see "Cannot find module" errors:
1. Restart the development server: `npm run dev`
2. Clear TypeScript cache
3. Restart VS Code TypeScript service

#### API Connection Issues
If the chat doesn't work:
1. Verify backend is running
2. Check API endpoints in `src/services/api.ts`
3. Check browser console for CORS errors

---

Built with ❤️ using React, TypeScript, and modern web technologies.
