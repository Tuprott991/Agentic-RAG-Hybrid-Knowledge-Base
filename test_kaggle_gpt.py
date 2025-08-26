import requests

with requests.post(
    "https://189ef72d648c.ngrok-free.app/v1/chat/completions",
    json={
        "model": "gpt-oss-20b",
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello hehe"}
        ],
        "stream": True
    },
    stream=True
) as r:
    for line in r.iter_lines():
        if line:
            data = line.decode()
            if data.startswith("data: "):
                data = data[len("data: "):]
            print(data)


