

import requests
import json
import sys
import time
from typing import List, Dict, Any
from datetime import datetime

class StreamingChatbot:
    def __init__(self, base_url: str = "https://6f7ed1d45c55.ngrok-free.app/v1/chat/completions"):
        self.base_url = base_url
        self.headers = {"Content-Type": "application/json"}
        self.conversation_history: List[Dict[str, str]] = []
        self.model = "gpt-oss-20b"
        
    def add_system_message(self, content: str):
        """Add a system message to the conversation"""
        self.conversation_history.append({"role": "system", "content": content})
    
    def add_user_message(self, content: str):
        """Add a user message to the conversation"""
        self.conversation_history.append({"role": "user", "content": content})
    
    def add_assistant_message(self, content: str):
        """Add an assistant message to the conversation"""
        self.conversation_history.append({"role": "assistant", "content": content})
    
    def stream_response(self, user_input: str, max_tokens: int = 500, temperature: float = 0.7) -> str:
        """Send user input and stream the response"""
        # Add user message to history
        self.add_user_message(user_input)
        
        payload = {
            "model": self.model,
            "messages": self.conversation_history,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": True
        }
        
        try:
            response = requests.post(self.base_url, headers=self.headers, json=payload, stream=True)
            response.raise_for_status()
            
            assistant_response = ""
            print("\n🤖 Assistant: ", end='', flush=True)
            
            for line in response.iter_lines():
                if line:
                    line = line.decode('utf-8')
                    if line.startswith('data: '):
                        data = line[6:]  # Remove 'data: ' prefix
                        if data.strip() == '[DONE]':
                            break
                        try:
                            chunk = json.loads(data)
                            delta = chunk.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                print(content, end='', flush=True)
                                assistant_response += content
                                # Add small delay for better streaming effect
                                time.sleep(0.01)
                        except json.JSONDecodeError:
                            continue
            
            print()  # Add newline after response
            
            # Add assistant response to conversation history
            if assistant_response:
                self.add_assistant_message(assistant_response)
            
            return assistant_response
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Error connecting to the API: {e}"
            print(f"\n❌ {error_msg}")
            return ""
        except Exception as e:
            error_msg = f"Unexpected error: {e}"
            print(f"\n❌ {error_msg}")
            return ""
    
    def clear_history(self):
        """Clear conversation history except system messages"""
        self.conversation_history = [msg for msg in self.conversation_history if msg["role"] == "system"]
    
    def get_conversation_summary(self) -> str:
        """Get a summary of the current conversation"""
        user_messages = len([msg for msg in self.conversation_history if msg["role"] == "user"])
        assistant_messages = len([msg for msg in self.conversation_history if msg["role"] == "assistant"])
        return f"Messages: {user_messages} user, {assistant_messages} assistant"
    
    def save_conversation(self, filename: str = None):
        """Save conversation to a JSON file"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"conversation_{timestamp}.json"
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.conversation_history, f, indent=2, ensure_ascii=False)
            print(f"\n💾 Conversation saved to {filename}")
        except Exception as e:
            print(f"\n❌ Error saving conversation: {e}")

def print_welcome():
    """Print welcome message and instructions"""
    print("=" * 60)
    print("🤖 Interactive Streaming Chatbot")
    print("=" * 60)
    print("Commands:")
    print("  /help     - Show this help message")
    print("  /clear    - Clear conversation history")
    print("  /history  - Show conversation summary")
    print("  /save     - Save conversation to file")
    print("  /quit     - Exit the chatbot")
    print("  /exit     - Exit the chatbot")
    print("=" * 60)
    print("Type your message and press Enter to chat!")
    print("=" * 60)

def print_help():
    """Print help message"""
    print("\n📖 Help:")
    print("  - Type any message to chat with the AI assistant")
    print("  - Use commands starting with '/' for special actions")
    print("  - The conversation history is maintained across messages")
    print("  - Responses are streamed in real-time")

def main():
    """Main chatbot loop"""
    chatbot = StreamingChatbot()
    
    # Add default system message
    chatbot.add_system_message("You are a helpful, friendly, and knowledgeable AI assistant. Provide clear, accurate, and engaging responses.")
    
    print_welcome()
    
    while True:
        try:
            # Get user input
            user_input = input("\n👤 You: ").strip()
            
            if not user_input:
                continue
            
            # Handle commands
            if user_input.lower() in ['/quit', '/exit']:
                print("\n👋 Goodbye! Thanks for chatting!")
                break
            elif user_input.lower() == '/help':
                print_help()
                continue
            elif user_input.lower() == '/clear':
                chatbot.clear_history()
                chatbot.add_system_message("You are a helpful, friendly, and knowledgeable AI assistant. Provide clear, accurate, and engaging responses.")
                print("\n🧹 Conversation history cleared!")
                continue
            elif user_input.lower() == '/history':
                summary = chatbot.get_conversation_summary()
                print(f"\n📊 Conversation Summary: {summary}")
                continue
            elif user_input.lower() == '/save':
                chatbot.save_conversation()
                continue
            
            # Process regular chat message
            response = chatbot.stream_response(user_input)
            
            if not response:
                print("⚠️  No response received. Please try again.")
        
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye! Thanks for chatting!")
            break
        except EOFError:
            print("\n\n👋 Goodbye! Thanks for chatting!")
            break
        except Exception as e:
            print(f"\n❌ An error occurred: {e}")
            print("Please try again.")

if __name__ == "__main__":
    main()
