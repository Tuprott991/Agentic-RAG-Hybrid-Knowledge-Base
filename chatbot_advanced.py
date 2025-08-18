#!/usr/bin/env python3
"""
Advanced Interactive Chatbot with Enhanced Features
Based on test_vllm.py - Professional conversational experience
"""

import requests
import json
import sys
import time
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
import threading
from dataclasses import dataclass

@dataclass
class ChatbotSettings:
    """Configuration settings for the chatbot"""
    max_tokens: int = 2048
    temperature: float = 0.2
    model: str = "Qwen/Qwen3-8B"
    base_url: str = "http://35.197.140.70:8000/v1/chat/completions"
    streaming_delay: float = 0.01
    auto_save: bool = False
    show_typing_indicator: bool = True

class AdvancedStreamingChatbot:
    def __init__(self, settings: ChatbotSettings = None):
        self.settings = settings or ChatbotSettings()
        self.headers = {"Content-Type": "application/json"}
        self.conversation_history: List[Dict[str, str]] = []
        self.current_theme = "general"
        self.themes = {
            "general": "You are a helpful, friendly, and knowledgeable AI assistant.",
            "technical": "You are a technical expert providing detailed, accurate technical assistance.",
            "creative": "You are a creative assistant helping with writing, brainstorming, and artistic endeavors.",
            "educational": "You are an educational tutor providing clear explanations and learning guidance.",
            "business": "You are a business consultant providing professional advice and insights."
        }
        
    def set_theme(self, theme: str):
        """Set the conversation theme"""
        if theme in self.themes:
            self.current_theme = theme
            # Clear existing system messages and add new theme
            self.conversation_history = [msg for msg in self.conversation_history 
                                       if msg["role"] != "system"]
            self.add_system_message(self.themes[theme])
            return True
        return False
    
    def add_system_message(self, content: str):
        """Add a system message to the conversation"""
        self.conversation_history.append({"role": "system", "content": content})
    
    def add_user_message(self, content: str):
        """Add a user message to the conversation"""
        self.conversation_history.append({"role": "user", "content": content})
    
    def add_assistant_message(self, content: str):
        """Add an assistant message to the conversation"""
        self.conversation_history.append({"role": "assistant", "content": content})
    
    def show_typing_indicator(self, duration: float = 1.0):
        """Show typing indicator animation"""
        if not self.settings.show_typing_indicator:
            return
            
        print("\n🤖 Assistant is typing", end="", flush=True)
        for _ in range(int(duration * 4)):
            for char in "...":
                print(char, end="", flush=True)
                time.sleep(0.25)
                sys.stdout.write('\b')
                sys.stdout.flush()
        print("\r" + " " * 25 + "\r", end="", flush=True)  # Clear typing indicator
    
    def stream_response(self, user_input: str) -> str:
        """Send user input and stream the response"""
        # Add user message to history
        self.add_user_message(user_input)
        
        payload = {
            "model": self.settings.model,
            "messages": self.conversation_history,
            "max_tokens": self.settings.max_tokens,
            "temperature": self.settings.temperature,
            "stream": True
        }
        
        try:
            # Show typing indicator
            self.show_typing_indicator(0.5)
            
            response = requests.post(self.settings.base_url, headers=self.headers, 
                                   json=payload, stream=True, timeout=30)
            response.raise_for_status()
            
            assistant_response = ""
            print("🤖 Assistant: ", end='', flush=True)
            
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
                                time.sleep(self.settings.streaming_delay)
                        except json.JSONDecodeError:
                            continue
            
            print()  # Add newline after response
            
            # Add assistant response to conversation history
            if assistant_response:
                self.add_assistant_message(assistant_response)
                
                # Auto-save if enabled
                if self.settings.auto_save:
                    self.auto_save_conversation()
            
            return assistant_response
            
        except requests.exceptions.Timeout:
            error_msg = "Request timed out. Please try again."
            print(f"\n⏱️ {error_msg}")
            return ""
        except requests.exceptions.RequestException as e:
            error_msg = f"Connection error: {e}"
            print(f"\n❌ {error_msg}")
            return ""
        except Exception as e:
            error_msg = f"Unexpected error: {e}"
            print(f"\n❌ {error_msg}")
            return ""
    
    def clear_history(self):
        """Clear conversation history except system messages"""
        system_messages = [msg for msg in self.conversation_history if msg["role"] == "system"]
        self.conversation_history = system_messages
    
    def get_conversation_summary(self) -> Dict[str, Any]:
        """Get a detailed summary of the current conversation"""
        user_messages = len([msg for msg in self.conversation_history if msg["role"] == "user"])
        assistant_messages = len([msg for msg in self.conversation_history if msg["role"] == "assistant"])
        total_chars = sum(len(msg["content"]) for msg in self.conversation_history)
        
        return {
            "user_messages": user_messages,
            "assistant_messages": assistant_messages,
            "total_messages": user_messages + assistant_messages,
            "total_characters": total_chars,
            "current_theme": self.current_theme
        }
    
    def save_conversation(self, filename: str = None) -> str:
        """Save conversation to a JSON file"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"conversation_{self.current_theme}_{timestamp}.json"
        
        # Create conversations directory if it doesn't exist
        os.makedirs("conversations", exist_ok=True)
        filepath = os.path.join("conversations", filename)
        
        conversation_data = {
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "theme": self.current_theme,
                "settings": {
                    "model": self.settings.model,
                    "max_tokens": self.settings.max_tokens,
                    "temperature": self.settings.temperature
                },
                "summary": self.get_conversation_summary()
            },
            "conversation": self.conversation_history
        }
        
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(conversation_data, f, indent=2, ensure_ascii=False)
            return filepath
        except Exception as e:
            raise Exception(f"Error saving conversation: {e}")
    
    def auto_save_conversation(self):
        """Auto-save conversation in background"""
        try:
            filepath = self.save_conversation()
            # Uncomment the next line if you want to see auto-save notifications
            # print(f"\n💾 Auto-saved to {filepath}")
        except Exception:
            pass  # Silent fail for auto-save
    
    def load_conversation(self, filepath: str) -> bool:
        """Load conversation from a JSON file"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if "conversation" in data:
                self.conversation_history = data["conversation"]
                if "metadata" in data and "theme" in data["metadata"]:
                    self.current_theme = data["metadata"]["theme"]
                return True
            return False
        except Exception:
            return False

def print_header():
    """Print application header"""
    print("\n" + "=" * 70)
    print("🚀 ADVANCED STREAMING CHATBOT")
    print("   Enhanced conversational AI with professional features")
    print("=" * 70)

def print_help():
    """Print comprehensive help"""
    help_text = """
📖 HELP & COMMANDS:

💬 CHAT COMMANDS:
  • Type any message to chat with the AI
  • Responses stream in real-time for natural conversation

🎨 THEME COMMANDS:
  /theme general     - General helpful assistant (default)
  /theme technical   - Technical expert mode
  /theme creative    - Creative writing assistant
  /theme educational - Educational tutor mode
  /theme business    - Business consultant mode
  /themes            - List all available themes

💾 CONVERSATION MANAGEMENT:
  /save [filename]   - Save conversation to file
  /load <filename>   - Load previous conversation
  /clear             - Clear conversation history
  /history           - Show conversation statistics

⚙️ SETTINGS:
  /settings          - Show current settings
  /temp <0.1-2.0>    - Set response creativity (temperature)
  /tokens <number>   - Set max response length
  /autosave on/off   - Toggle auto-save feature

ℹ️ GENERAL:
  /help              - Show this help
  /quit, /exit       - Exit chatbot
"""
    print(help_text)

def print_status(chatbot: AdvancedStreamingChatbot):
    """Print current status and settings"""
    summary = chatbot.get_conversation_summary()
    print(f"""
📊 CURRENT STATUS:
  Theme: {summary['current_theme']} 
  Messages: {summary['user_messages']} user, {summary['assistant_messages']} assistant
  Model: {chatbot.settings.model}
  Temperature: {chatbot.settings.temperature}
  Max Tokens: {chatbot.settings.max_tokens}
  Auto-save: {'ON' if chatbot.settings.auto_save else 'OFF'}
""")

def main():
    """Main chatbot application"""
    settings = ChatbotSettings()
    chatbot = AdvancedStreamingChatbot(settings)
    
    # Initialize with default theme
    chatbot.set_theme("general")
    
    print_header()
    print("Type '/help' for commands or start chatting!")
    print("=" * 70)
    
    while True:
        try:
            # Get user input
            user_input = input("\n👤 You: ").strip()
            
            if not user_input:
                continue
            
            # Handle commands
            if user_input.lower() in ['/quit', '/exit']:
                print("\n👋 Thanks for using Advanced Streaming Chatbot! Goodbye!")
                break
                
            elif user_input.lower() == '/help':
                print_help()
                continue
                
            elif user_input.lower() == '/settings':
                print_status(chatbot)
                continue
                
            elif user_input.lower() == '/clear':
                chatbot.clear_history()
                chatbot.set_theme(chatbot.current_theme)  # Restore theme
                print("\n🧹 Conversation history cleared!")
                continue
                
            elif user_input.lower() == '/history':
                summary = chatbot.get_conversation_summary()
                print(f"\n📊 Conversation: {summary['user_messages']} user messages, "
                      f"{summary['assistant_messages']} assistant messages")
                print(f"📝 Total characters: {summary['total_characters']}")
                print(f"🎨 Current theme: {summary['current_theme']}")
                continue
                
            elif user_input.lower() == '/themes':
                print("\n🎨 Available themes:")
                for theme, description in chatbot.themes.items():
                    marker = "→" if theme == chatbot.current_theme else " "
                    print(f"  {marker} {theme}: {description}")
                continue
                
            elif user_input.lower().startswith('/theme '):
                theme = user_input[7:].strip()
                if chatbot.set_theme(theme):
                    print(f"\n🎨 Theme changed to: {theme}")
                else:
                    print(f"\n❌ Unknown theme: {theme}. Type '/themes' to see available themes.")
                continue
                
            elif user_input.lower().startswith('/temp '):
                try:
                    temp = float(user_input[6:].strip())
                    if 0.1 <= temp <= 2.0:
                        chatbot.settings.temperature = temp
                        print(f"\n🌡️ Temperature set to: {temp}")
                    else:
                        print("\n❌ Temperature must be between 0.1 and 2.0")
                except ValueError:
                    print("\n❌ Invalid temperature value")
                continue
                
            elif user_input.lower().startswith('/tokens '):
                try:
                    tokens = int(user_input[8:].strip())
                    if 50 <= tokens <= 2000:
                        chatbot.settings.max_tokens = tokens
                        print(f"\n📏 Max tokens set to: {tokens}")
                    else:
                        print("\n❌ Tokens must be between 50 and 2000")
                except ValueError:
                    print("\n❌ Invalid token value")
                continue
                
            elif user_input.lower().startswith('/autosave '):
                setting = user_input[10:].strip().lower()
                if setting in ['on', 'true', '1']:
                    chatbot.settings.auto_save = True
                    print("\n💾 Auto-save enabled")
                elif setting in ['off', 'false', '0']:
                    chatbot.settings.auto_save = False
                    print("\n💾 Auto-save disabled")
                else:
                    print("\n❌ Use '/autosave on' or '/autosave off'")
                continue
                
            elif user_input.lower() == '/save':
                try:
                    filepath = chatbot.save_conversation()
                    print(f"\n💾 Conversation saved to {filepath}")
                except Exception as e:
                    print(f"\n❌ Save failed: {e}")
                continue
                
            elif user_input.lower().startswith('/save '):
                filename = user_input[6:].strip()
                try:
                    filepath = chatbot.save_conversation(filename)
                    print(f"\n💾 Conversation saved to {filepath}")
                except Exception as e:
                    print(f"\n❌ Save failed: {e}")
                continue
            
            # Process regular chat message
            response = chatbot.stream_response(user_input)
            
            if not response:
                print("⚠️  No response received. Please try again.")
        
        except KeyboardInterrupt:
            print("\n\n👋 Thanks for using Advanced Streaming Chatbot! Goodbye!")
            break
        except EOFError:
            print("\n\n👋 Thanks for using Advanced Streaming Chatbot! Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ An error occurred: {e}")
            print("Please try again or type '/help' for assistance.")

if __name__ == "__main__":
    main()
