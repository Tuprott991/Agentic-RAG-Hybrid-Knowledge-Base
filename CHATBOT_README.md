# Streaming Chatbot Collection

This collection provides three different versions of a streaming chatbot based on the original `test_vllm.py` file, each offering different user experiences and features.

## 🚀 Available Versions

### 1. Simple Streaming Chatbot (`chatbot_streaming.py`)
A basic command-line chatbot with streaming responses and conversation history.

**Features:**
- Real-time streaming responses
- Conversation history maintained during session
- Simple commands (/help, /clear, /history, /save, /quit)
- Auto-save conversation to JSON files
- Easy to use and lightweight

**Usage:**
```bash
python chatbot_streaming.py
```

### 2. Advanced Streaming Chatbot (`chatbot_advanced.py`)
A sophisticated command-line chatbot with professional features and customization options.

**Features:**
- Multiple conversation themes (general, technical, creative, educational, business)
- Adjustable settings (temperature, max tokens, auto-save)
- Enhanced conversation management
- Professional status displays and help system
- Advanced conversation saving with metadata
- Typing indicators and improved streaming effects

**Usage:**
```bash
python chatbot_advanced.py
```

**Commands:**
- `/theme <name>` - Change conversation theme
- `/temp <0.1-2.0>` - Adjust response creativity
- `/tokens <number>` - Set maximum response length
- `/autosave on/off` - Toggle automatic saving
- `/save [filename]` - Save conversation
- `/load <filename>` - Load previous conversation

### 3. GUI Streaming Chatbot (`chatbot_gui.py`)
A graphical user interface version using tkinter for users who prefer visual interfaces.

**Features:**
- Modern dark-themed GUI
- Real-time streaming text display
- Visual settings controls (sliders for temperature and tokens)
- Save/Load conversations with file dialogs
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)
- Visual status indicators
- Threading for responsive UI during streaming

**Usage:**
```bash
python chatbot_gui.py
```

**Requirements:**
- tkinter (usually included with Python)
- All other dependencies same as console versions

## 📋 Requirements

All versions require the following Python packages:

```bash
pip install requests
```

For the GUI version, tkinter is also required (typically included with Python installations).

## ⚙️ Configuration

All chatbots are configured to use:
- **API Endpoint:** `http://35.197.140.70:8000/v1/chat/completions`
- **Model:** `Qwen/Qwen3-8B`
- **Default Temperature:** 0.7
- **Default Max Tokens:** 500

You can modify these settings in the source code or use the runtime configuration options in the advanced versions.

## 🎯 Use Cases

### Simple Version
Perfect for:
- Quick testing and development
- Basic chatbot functionality
- Minimal resource usage
- Learning how streaming works

### Advanced Version
Ideal for:
- Professional conversations
- Different conversation contexts
- Fine-tuned responses
- Power users who prefer command-line

### GUI Version
Best for:
- Users who prefer graphical interfaces
- Visual conversation management
- Easier settings adjustment
- More comfortable long conversations

## 💾 Conversation Storage

All versions support saving conversations:
- **Simple:** JSON files with timestamp
- **Advanced:** JSON files with metadata and conversation summaries
- **GUI:** Interactive file dialogs with metadata

Saved conversations include:
- Full message history
- Timestamp information
- Model settings used
- Conversation metadata

## 🔧 Customization

### Adding New Themes (Advanced Version)
```python
self.themes["custom"] = "Your custom system prompt here"
```

### Modifying Streaming Behavior
Adjust the `streaming_delay` or `time.sleep()` values to change streaming speed.

### Changing API Endpoint
Update the `base_url` variable in any version to use a different API endpoint.

## 🚨 Error Handling

All versions include comprehensive error handling for:
- Network connectivity issues
- API timeouts
- Invalid responses
- User input validation
- File operations

## 📝 Examples

### Basic Usage (Simple Version)
```
👤 You: Hello, how are you?
🤖 Assistant: Hello! I'm doing well, thank you for asking...
```

### Theme Usage (Advanced Version)
```
👤 You: /theme technical
🎨 Theme changed to: technical
👤 You: Explain machine learning
🤖 Assistant: Machine learning is a subset of artificial intelligence...
```

### Settings Adjustment (GUI Version)
Use the sliders in the settings panel to adjust temperature and max tokens in real-time.

## 🔗 Integration

These chatbots can be easily integrated into larger applications by:
1. Importing the chatbot classes
2. Using the streaming methods programmatically
3. Extending the base functionality

Example integration:
```python
from chatbot_streaming import StreamingChatbot

chatbot = StreamingChatbot()
response = chatbot.stream_response("Hello!")
```

## 🤝 Contributing

Feel free to extend these chatbots with additional features such as:
- More conversation themes
- Additional file format support
- Plugin system for custom commands
- Voice input/output capabilities
- Multi-language support

---

Choose the version that best fits your needs and enjoy streaming conversations with AI! 🎉
