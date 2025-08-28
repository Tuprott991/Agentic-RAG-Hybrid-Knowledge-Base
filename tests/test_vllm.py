import requests
import json

url = "http://35.197.140.70:8000/v1/chat/completions"
headers = {"Content-Type": "application/json"}

payload = {
    "model": "Qwen/Qwen3-8B",
    "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Who is the president of the United States?"}
    ],
    "max_tokens": 200,
    "temperature": 0.7,
    "stream": True
}

response = requests.post(url, headers=headers, json=payload, stream=True)

# Process streaming response
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
            except json.JSONDecodeError:
                continue

print()  # Add newline at the end

if __name__ == "__main__":
    pass