import requests
import json

# Your ngrok public URL
BASE_URL = "https://c533d212d673.ngrok-free.app"

# Endpoint for chat completion (llama.cpp exposes this like OpenAI)
url = f"{BASE_URL}/v1/chat/completions"

# Define the chat messages
payload = {
    "model": "gemma-3-27b-it-q4_0",  # must match the model you launched
    "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello! Can you explain what a black hole is?"}
    ],
    "stream": True  # enable streaming
}

# Stream the response
with requests.post(url, json=payload, stream=True) as r:
    for line in r.iter_lines():
        if line:
            try:
                data = json.loads(line.decode("utf-8").replace("data: ", ""))
                if "choices" in data:
                    delta = data["choices"][0]["delta"]
                    if "content" in delta:
                        print(delta["content"], end="", flush=True)
            except Exception:
                continue
