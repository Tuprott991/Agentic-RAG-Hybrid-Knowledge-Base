#!/usr/bin/env python3
"""
GUI Streaming Chatbot with Tkinter
Based on test_vllm.py - Graphical user interface version
"""

import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox, filedialog
import requests
import json
import threading
import time
from datetime import datetime
from typing import List, Dict, Any
import queue
import os

class StreamingChatbotGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("🤖 Streaming Chatbot GUI")
        self.root.geometry("800x600")
        self.root.configure(bg='#2b2b2b')
        
        # Configuration
        self.base_url = "http://35.197.140.70:8000/v1/chat/completions"
        self.headers = {"Content-Type": "application/json"}
        self.conversation_history: List[Dict[str, str]] = []
        self.model = "Qwen/Qwen3-8B"
        self.max_tokens = 2048
        self.temperature = 0.2
        
        # Threading
        self.response_queue = queue.Queue()
        self.is_streaming = False
        self.stop_requested = False
        
        # Initialize with system message
        self.conversation_history.append({
            "role": "system", 
            "content": "You are a helpful, friendly, and knowledgeable AI assistant."
        })
        
        self.create_widgets()
        self.setup_bindings()
        
        # Start the queue processor
        self.root.after(100, self.process_queue)
    
    def create_widgets(self):
        """Create and layout GUI widgets"""
        # Main frame
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(0, weight=1)
        main_frame.rowconfigure(1, weight=1)
        
        # Title
        title_label = ttk.Label(main_frame, text="🤖 Streaming AI Chatbot", 
                               font=('Arial', 16, 'bold'))
        title_label.grid(row=0, column=0, pady=(0, 10))
        
        # Chat display area
        chat_frame = ttk.Frame(main_frame)
        chat_frame.grid(row=1, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(0, 10))
        chat_frame.columnconfigure(0, weight=1)
        chat_frame.rowconfigure(0, weight=1)
        
        self.chat_display = scrolledtext.ScrolledText(
            chat_frame, 
            wrap=tk.WORD, 
            font=('Consolas', 10),
            bg='#1e1e1e',
            fg='#ffffff',
            insertbackground='#ffffff',
            selectbackground='#404040'
        )
        self.chat_display.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure tags for different message types
        self.chat_display.tag_configure("user", foreground="#4CAF50", font=('Consolas', 10, 'bold'))
        self.chat_display.tag_configure("assistant", foreground="#2196F3", font=('Consolas', 10, 'bold'))
        self.chat_display.tag_configure("system", foreground="#FF9800", font=('Consolas', 10, 'italic'))
        self.chat_display.tag_configure("timestamp", foreground="#666666", font=('Consolas', 8))
        
        # Input frame
        input_frame = ttk.Frame(main_frame)
        input_frame.grid(row=2, column=0, sticky=(tk.W, tk.E), pady=(0, 10))
        input_frame.columnconfigure(0, weight=1)
        
        # Input text area
        self.input_text = tk.Text(
            input_frame, 
            height=3, 
            wrap=tk.WORD,
            font=('Consolas', 10),
            bg='#2d2d2d',
            fg='#ffffff',
            insertbackground='#ffffff'
        )
        self.input_text.grid(row=0, column=0, sticky=(tk.W, tk.E), padx=(0, 5))
        
        # Button frame
        button_frame = ttk.Frame(input_frame)
        button_frame.grid(row=0, column=1, sticky=(tk.N, tk.S))
        
        # Send button
        self.send_button = ttk.Button(
            button_frame, 
            text="Send", 
            command=self.send_message,
            width=8
        )
        self.send_button.grid(row=0, column=0, pady=(0, 5))
        
        # Clear button
        self.clear_button = ttk.Button(
            button_frame, 
            text="Clear", 
            command=self.clear_chat,
            width=8
        )
        self.clear_button.grid(row=1, column=0)
        
        # Stop button
        self.stop_button = ttk.Button(
            button_frame, 
            text="Stop", 
            command=self.stop_streaming,
            width=8,
            state=tk.DISABLED
        )
        self.stop_button.grid(row=2, column=0, pady=(5, 0))
        
        # Status and controls frame
        status_frame = ttk.Frame(main_frame)
        status_frame.grid(row=3, column=0, sticky=(tk.W, tk.E))
        status_frame.columnconfigure(1, weight=1)
        
        # Settings frame
        settings_frame = ttk.LabelFrame(status_frame, text="Settings", padding="5")
        settings_frame.grid(row=0, column=0, sticky=(tk.W, tk.N), padx=(0, 10))
        
        # Temperature setting
        ttk.Label(settings_frame, text="Temperature:").grid(row=0, column=0, sticky=tk.W)
        self.temp_var = tk.DoubleVar(value=self.temperature)
        temp_scale = ttk.Scale(
            settings_frame, 
            from_=0.1, 
            to=2.0, 
            variable=self.temp_var,
            orient=tk.HORIZONTAL,
            length=100,
            command=self.update_temperature
        )
        temp_scale.grid(row=0, column=1, padx=(5, 0))
        
        self.temp_label = ttk.Label(settings_frame, text=f"{self.temperature:.1f}")
        self.temp_label.grid(row=0, column=2, padx=(5, 0))
        
        # Max tokens setting
        ttk.Label(settings_frame, text="Max Tokens:").grid(row=1, column=0, sticky=tk.W)
        self.tokens_var = tk.IntVar(value=self.max_tokens)
        tokens_scale = ttk.Scale(
            settings_frame, 
            from_=50, 
            to=4000, 
            variable=self.tokens_var,
            orient=tk.HORIZONTAL,
            length=100,
            command=self.update_tokens
        )
        tokens_scale.grid(row=1, column=1, padx=(5, 0))
        
        self.tokens_label = ttk.Label(settings_frame, text=f"{self.max_tokens}")
        self.tokens_label.grid(row=1, column=2, padx=(5, 0))
        
        # Model selection
        ttk.Label(settings_frame, text="Model:").grid(row=2, column=0, sticky=tk.W)
        self.model_var = tk.StringVar(value=self.model)
        model_combo = ttk.Combobox(
            settings_frame,
            textvariable=self.model_var,
            values=["Qwen/Qwen3-8B", "meta-llama/Llama-2-7b-chat-hf", "microsoft/DialoGPT-medium"],
            width=20,
            state="readonly"
        )
        model_combo.grid(row=2, column=1, columnspan=2, padx=(5, 0), pady=(5, 0))
        model_combo.bind("<<ComboboxSelected>>", self.update_model)
        
        # Status frame
        status_info_frame = ttk.Frame(status_frame)
        status_info_frame.grid(row=0, column=1, sticky=(tk.W, tk.E))
        
        self.status_label = ttk.Label(
            status_info_frame, 
            text="Ready to chat!", 
            font=('Arial', 10)
        )
        self.status_label.grid(row=0, column=0, sticky=tk.W)
        
        # Character count label
        self.char_count_label = ttk.Label(
            status_info_frame,
            text="0 characters",
            font=('Arial', 8),
            foreground='gray'
        )
        self.char_count_label.grid(row=1, column=0, sticky=tk.W)
        
        # Control buttons frame
        control_frame = ttk.Frame(status_frame)
        control_frame.grid(row=0, column=2, sticky=tk.E)
        
        # Save button
        save_button = ttk.Button(
            control_frame, 
            text="Save Chat", 
            command=self.save_conversation
        )
        save_button.grid(row=0, column=0, padx=(0, 5))
        
        # Load button
        load_button = ttk.Button(
            control_frame, 
            text="Load Chat", 
            command=self.load_conversation
        )
        load_button.grid(row=0, column=1)
        
        # Add welcome message
        self.add_system_message("Welcome to the Streaming AI Chatbot! Type your message and press Send or Enter.")
        
        # Test connection on startup
        self.test_connection()
    
    def setup_bindings(self):
        """Setup keyboard bindings"""
        # Bind Enter to send message (Shift+Enter for new line)
        self.input_text.bind('<Return>', self.on_enter_key)
        self.input_text.bind('<Shift-Return>', self.on_shift_enter)
        self.input_text.bind('<KeyRelease>', self.update_char_count)
        
        # Focus on input area
        self.input_text.focus_set()
    
    def on_enter_key(self, event):
        """Handle Enter key press"""
        if not self.is_streaming:
            self.send_message()
        return 'break'  # Prevent default behavior
    
    def on_shift_enter(self, event):
        """Handle Shift+Enter key press for new line"""
        return None  # Allow default behavior (new line)
    
    def update_temperature(self, value):
        """Update temperature setting"""
        self.temperature = float(value)
        self.temp_label.config(text=f"{self.temperature:.1f}")
    
    def update_tokens(self, value):
        """Update max tokens setting"""
        self.max_tokens = int(float(value))
        self.tokens_label.config(text=f"{self.max_tokens}")
    
    def update_model(self, event=None):
        """Update model selection"""
        self.model = self.model_var.get()
        self.add_system_message(f"Model changed to: {self.model}")
    
    def update_char_count(self, event=None):
        """Update character count display"""
        char_count = len(self.input_text.get(1.0, tk.END).strip())
        self.char_count_label.config(text=f"{char_count} characters")
    
    def add_message_to_display(self, role: str, content: str, timestamp: str = None):
        """Add a message to the chat display"""
        if timestamp is None:
            timestamp = datetime.now().strftime("%H:%M:%S")
        
        self.chat_display.config(state=tk.NORMAL)
        
        # Add timestamp
        self.chat_display.insert(tk.END, f"[{timestamp}] ", "timestamp")
        
        # Add role indicator
        if role == "user":
            self.chat_display.insert(tk.END, "👤 You: ", "user")
        elif role == "assistant":
            self.chat_display.insert(tk.END, "🤖 Assistant: ", "assistant")
        elif role == "system":
            self.chat_display.insert(tk.END, "ℹ️ System: ", "system")
        
        # Add message content
        self.chat_display.insert(tk.END, content + "\n\n")
        
        self.chat_display.config(state=tk.DISABLED)
        self.chat_display.see(tk.END)
    
    def add_system_message(self, content: str):
        """Add a system message"""
        self.add_message_to_display("system", content)
    
    def send_message(self):
        """Send user message and get AI response"""
        if self.is_streaming:
            return
        
        user_input = self.input_text.get(1.0, tk.END).strip()
        if not user_input:
            return
        
        # Add user message to display
        self.add_message_to_display("user", user_input)
        
        # Clear input
        self.input_text.delete(1.0, tk.END)
        self.update_char_count()  # Reset character count
        
        # Add to conversation history
        self.conversation_history.append({"role": "user", "content": user_input})
        
        # Disable send button and update status
        self.send_button.config(state=tk.DISABLED)
        self.stop_button.config(state=tk.NORMAL)
        self.status_label.config(text="AI is thinking...")
        self.is_streaming = True
        self.stop_requested = False
        
        # Start streaming response in separate thread
        threading.Thread(target=self.stream_response, daemon=True).start()
    
    def stream_response(self):
        """Stream AI response (runs in separate thread)"""
        payload = {
            "model": self.model,
            "messages": self.conversation_history,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "stream": True
        }
        
        try:
            response = requests.post(self.base_url, headers=self.headers, 
                                   json=payload, stream=True, timeout=30)
            response.raise_for_status()
            
            assistant_response = ""
            
            # Signal start of assistant message
            self.response_queue.put(("start", ""))
            
            for line in response.iter_lines():
                if line and not self.stop_requested:
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
                                assistant_response += content
                                # Queue content for display
                                self.response_queue.put(("content", content))
                                time.sleep(0.01)  # Small delay for streaming effect
                        except json.JSONDecodeError:
                            continue
                elif self.stop_requested:
                    break
            
            # Add to conversation history
            if assistant_response:
                self.conversation_history.append({"role": "assistant", "content": assistant_response})
            
            # Signal end of response
            self.response_queue.put(("end", assistant_response))
            
        except requests.exceptions.Timeout:
            self.response_queue.put(("error", "Request timed out. Please try again."))
        except requests.exceptions.RequestException as e:
            self.response_queue.put(("error", f"Connection error: {e}"))
        except Exception as e:
            self.response_queue.put(("error", f"Unexpected error: {e}"))
    
    def process_queue(self):
        """Process messages from the response queue"""
        try:
            while True:
                message_type, content = self.response_queue.get_nowait()
                
                if message_type == "start":
                    # Start new assistant message
                    timestamp = datetime.now().strftime("%H:%M:%S")
                    self.chat_display.config(state=tk.NORMAL)
                    self.chat_display.insert(tk.END, f"[{timestamp}] ", "timestamp")
                    self.chat_display.insert(tk.END, "🤖 Assistant: ", "assistant")
                    self.current_assistant_start = self.chat_display.index(tk.END)
                    self.chat_display.config(state=tk.DISABLED)
                    
                elif message_type == "content":
                    # Add streaming content
                    self.chat_display.config(state=tk.NORMAL)
                    self.chat_display.insert(tk.END, content)
                    self.chat_display.config(state=tk.DISABLED)
                    self.chat_display.see(tk.END)
                    
                elif message_type == "end":
                    # Finish assistant message
                    self.chat_display.config(state=tk.NORMAL)
                    self.chat_display.insert(tk.END, "\n\n")
                    self.chat_display.config(state=tk.DISABLED)
                    self.chat_display.see(tk.END)
                    
                    # Re-enable controls
                    self.send_button.config(state=tk.NORMAL)
                    self.stop_button.config(state=tk.DISABLED)
                    self.status_label.config(text="Ready to chat!")
                    self.is_streaming = False
                    self.input_text.focus_set()
                    
                elif message_type == "error":
                    # Display error
                    self.add_system_message(f"Error: {content}")
                    self.send_button.config(state=tk.NORMAL)
                    self.stop_button.config(state=tk.DISABLED)
                    self.status_label.config(text="Ready to chat!")
                    self.is_streaming = False
                    self.input_text.focus_set()
                    
                elif message_type == "connection":
                    # Update connection status
                    self.add_system_message(content)
                    
        except queue.Empty:
            pass
        
        # Schedule next queue check
        self.root.after(50, self.process_queue)
    
    def stop_streaming(self):
        """Stop the current streaming response"""
        if self.is_streaming:
            self.stop_requested = True
            self.add_system_message("Response stopped by user.")
            self.send_button.config(state=tk.NORMAL)
            self.stop_button.config(state=tk.DISABLED)
            self.status_label.config(text="Ready to chat!")
            self.is_streaming = False
            self.input_text.focus_set()
    
    def clear_chat(self):
        """Clear the chat display and conversation history"""
        if self.is_streaming:
            messagebox.showwarning("Warning", "Cannot clear chat while AI is responding.")
            return
        
        result = messagebox.askyesno("Confirm", "Clear all chat history?")
        if result:
            self.chat_display.config(state=tk.NORMAL)
            self.chat_display.delete(1.0, tk.END)
            self.chat_display.config(state=tk.DISABLED)
            
            # Reset conversation history (keep system message)
            self.conversation_history = [
                {"role": "system", "content": "You are a helpful, friendly, and knowledgeable AI assistant."}
            ]
            
            self.add_system_message("Chat cleared. Ready for a new conversation!")
    
    def save_conversation(self):
        """Save conversation to a file"""
        if not self.conversation_history or len(self.conversation_history) <= 1:
            messagebox.showinfo("Info", "No conversation to save.")
            return
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"conversation_{timestamp}.json"
        
        filepath = filedialog.asksaveasfilename(
            defaultextension=".json",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
            initialvalue=filename
        )
        
        if filepath:
            try:
                conversation_data = {
                    "metadata": {
                        "timestamp": datetime.now().isoformat(),
                        "model": self.model,
                        "temperature": self.temperature,
                        "max_tokens": self.max_tokens
                    },
                    "conversation": self.conversation_history
                }
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(conversation_data, f, indent=2, ensure_ascii=False)
                
                messagebox.showinfo("Success", f"Conversation saved to {filepath}")
                
            except Exception as e:
                messagebox.showerror("Error", f"Failed to save conversation: {e}")
    
    def load_conversation(self):
        """Load conversation from a file"""
        if self.is_streaming:
            messagebox.showwarning("Warning", "Cannot load conversation while AI is responding.")
            return
        
        filepath = filedialog.askopenfilename(
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
        )
        
        if filepath:
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                if "conversation" in data:
                    # Clear current display
                    self.chat_display.config(state=tk.NORMAL)
                    self.chat_display.delete(1.0, tk.END)
                    self.chat_display.config(state=tk.DISABLED)
                    
                    # Load conversation
                    self.conversation_history = data["conversation"]
                    
                    # Display loaded conversation
                    for msg in self.conversation_history:
                        if msg["role"] != "system":  # Don't display system messages
                            self.add_message_to_display(msg["role"], msg["content"])
                    
                    # Update settings if available
                    if "metadata" in data:
                        metadata = data["metadata"]
                        if "temperature" in metadata:
                            self.temperature = metadata["temperature"]
                            self.temp_var.set(self.temperature)
                            self.temp_label.config(text=f"{self.temperature:.1f}")
                        if "max_tokens" in metadata:
                            self.max_tokens = metadata["max_tokens"]
                            self.tokens_var.set(self.max_tokens)
                            self.tokens_label.config(text=f"{self.max_tokens}")
                    
                    messagebox.showinfo("Success", "Conversation loaded successfully!")
                else:
                    messagebox.showerror("Error", "Invalid conversation file format.")
                    
            except Exception as e:
                messagebox.showerror("Error", f"Failed to load conversation: {e}")
    
    def test_connection(self):
        """Test connection to the AI service"""
        def test():
            try:
                test_payload = {
                    "model": self.model,
                    "messages": [{"role": "user", "content": "test"}],
                    "max_tokens": 1,
                    "stream": False
                }
                response = requests.post(self.base_url, headers=self.headers, 
                                       json=test_payload, timeout=5)
                if response.status_code == 200:
                    self.response_queue.put(("connection", "✅ Connected to AI service"))
                else:
                    self.response_queue.put(("connection", f"⚠️ Service returned status {response.status_code}"))
            except requests.exceptions.Timeout:
                self.response_queue.put(("connection", "❌ Connection timeout"))
            except requests.exceptions.RequestException as e:
                self.response_queue.put(("connection", f"❌ Connection failed: {str(e)[:50]}..."))
            except Exception as e:
                self.response_queue.put(("connection", f"❌ Error: {str(e)[:50]}..."))
        
        threading.Thread(target=test, daemon=True).start()

def main():
    """Main function to run the GUI chatbot"""
    root = tk.Tk()
    app = StreamingChatbotGUI(root)
    
    # Handle window close
    def on_closing():
        if app.is_streaming:
            result = messagebox.askyesno(
                "Confirm Exit", 
                "AI is currently responding. Are you sure you want to exit?"
            )
            if not result:
                return
        root.destroy()
    
    root.protocol("WM_DELETE_WINDOW", on_closing)
    
    # Start the GUI
    root.mainloop()

if __name__ == "__main__":
    main()
