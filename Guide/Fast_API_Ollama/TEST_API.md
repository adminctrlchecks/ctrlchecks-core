# Testing FastAPI Ollama Backend

**Complete guide to test all endpoints of your FastAPI Ollama service**

---

## Prerequisites

- ✅ FastAPI service running
- ✅ Ollama service running
- ✅ Models installed (qwen2.5:14b-instruct-q4_K_M, qwen2.5-coder:7b-instruct-q4_K_M)

---

## Quick Test Commands

### Test 1: Health Check

```bash
# Local
curl http://localhost:8000/health

# With domain (if configured)
curl https://ollama.ctrlchecks.ai/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "ollama": "running",
  "ltx2": "unavailable",
  "timestamp": 1234567890.123
}
```

---

### Test 2: Service Info

```bash
curl http://localhost:8000/
```

**Expected Response:**
```json
{
  "name": "CtrlChecks Ollama FastAPI Service",
  "version": "1.0.0",
  "status": "running"
}
```

---

### Test 3: List Available Models

```bash
curl http://localhost:8000/api/tags
```

**Expected Response:**
```json
{
  "models": [
    {
      "name": "qwen2.5:14b-instruct-q4_K_M",
      "model": "qwen2.5:14b-instruct-q4_K_M",
      "size": 8000000000,
      ...
    },
    {
      "name": "qwen2.5-coder:7b-instruct-q4_K_M",
      "model": "qwen2.5-coder:7b-instruct-q4_K_M",
      "size": 4500000000,
      ...
    }
  ]
}
```

---

### Test 4: Chat Endpoint

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:14b-instruct-q4_K_M",
    "messages": [
      {"role": "user", "content": "Hello! Say hi back in one sentence."}
    ],
    "stream": false
  }'
```

**Expected Response:**
```json
{
  "model": "qwen2.5:14b-instruct-q4_K_M",
  "message": {
    "role": "assistant",
    "content": "Hello! How can I help you today?"
  },
  "done": true
}
```

---

### Test 5: Generate Endpoint

```bash
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:14b-instruct-q4_K_M",
    "prompt": "Write a haiku about coding",
    "stream": false
  }'
```

**Expected Response:**
```json
{
  "model": "qwen2.5:14b-instruct-q4_K_M",
  "response": "Lines of code flow\nLike poetry in motion\nBugs hide in the dark",
  "done": true
}
```

---

### Test 6: Video Info (LTX-2)

```bash
curl http://localhost:8000/api/video/info
```

**Expected Response:**
```json
{
  "enabled": false,
  "status": "unavailable",
  "modes": [
    "text-to-video",
    "image-to-video",
    "audio-to-video",
    "video-to-video",
    "image-text-to-video",
    "text-to-audio",
    "audio-to-audio"
  ]
}
```

---

## Complete Test Script

Save this as `test_api.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:8000"
# Or use domain: BASE_URL="https://ollama.ctrlchecks.ai"

echo "=========================================="
echo "Testing FastAPI Ollama Backend"
echo "=========================================="
echo ""

echo "1. Health Check..."
curl -s "$BASE_URL/health" | jq .
echo ""

echo "2. Service Info..."
curl -s "$BASE_URL/" | jq .
echo ""

echo "3. List Models..."
curl -s "$BASE_URL/api/tags" | jq '.models[] | {name: .name, size: .size}'
echo ""

echo "4. Chat Test..."
curl -s -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:14b-instruct-q4_K_M",
    "messages": [{"role": "user", "content": "Say hello in one word"}],
    "stream": false
  }' | jq .
echo ""

echo "5. Generate Test..."
curl -s -X POST "$BASE_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:14b-instruct-q4_K_M",
    "prompt": "What is 2+2?",
    "stream": false
  }' | jq .
echo ""

echo "6. Video Info..."
curl -s "$BASE_URL/api/video/info" | jq .
echo ""

echo "=========================================="
echo "All tests completed!"
echo "=========================================="
```

**Run the script:**
```bash
chmod +x test_api.sh
./test_api.sh
```

---

## Test with Python

Create `test_api.py`:

```python
import requests
import json

BASE_URL = "http://localhost:8000"
# Or: BASE_URL = "https://ollama.ctrlchecks.ai"

def test_health():
    print("1. Testing Health Check...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_models():
    print("2. Testing Models List...")
    response = requests.get(f"{BASE_URL}/api/tags")
    models = response.json().get("models", [])
    print(f"Found {len(models)} models:")
    for model in models:
        print(f"  - {model['name']}")
    print()

def test_chat():
    print("3. Testing Chat...")
    response = requests.post(
        f"{BASE_URL}/api/chat",
        json={
            "model": "qwen2.5:14b-instruct-q4_K_M",
            "messages": [
                {"role": "user", "content": "Say hello in one sentence"}
            ],
            "stream": False
        }
    )
    result = response.json()
    print(f"Response: {result.get('message', {}).get('content', 'No response')}")
    print()

def test_generate():
    print("4. Testing Generate...")
    response = requests.post(
        f"{BASE_URL}/api/generate",
        json={
            "model": "qwen2.5:14b-instruct-q4_K_M",
            "prompt": "What is Python?",
            "stream": False
        }
    )
    result = response.json()
    print(f"Response: {result.get('response', 'No response')[:100]}...")
    print()

if __name__ == "__main__":
    try:
        test_health()
        test_models()
        test_chat()
        test_generate()
        print("✅ All tests passed!")
    except Exception as e:
        print(f"❌ Error: {e}")
```

**Run:**
```bash
python3 test_api.py
```

---

## Test from Browser

### 1. Health Check
Open: `http://localhost:8000/health` or `https://ollama.ctrlchecks.ai/health`

### 2. Service Info
Open: `http://localhost:8000/` or `https://ollama.ctrlchecks.ai/`

### 3. API Documentation
Open: `http://localhost:8000/docs` or `https://ollama.ctrlchecks.ai/docs`

This shows the interactive Swagger UI where you can test all endpoints!

---

## Test Chat with Streaming

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:14b-instruct-q4_K_M",
    "messages": [
      {"role": "user", "content": "Write a short story about a robot"}
    ],
    "stream": true
  }'
```

This will stream the response token by token.

---

## Test Code Generation (qwen2.5-coder)

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-coder:7b",
    "messages": [
      {"role": "user", "content": "Write a Python function to calculate factorial"}
    ],
    "stream": false
  }'
```

---

## Test Error Handling

### Invalid Model
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "invalid-model",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'
```

Should return an error.

### Missing Required Fields
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{}'
```

Should return validation error.

---

## Performance Testing

### Test Response Time
```bash
time curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:14b-instruct-q4_K_M",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'
```

### Test Concurrent Requests
```bash
# Install Apache Bench (if not installed)
sudo apt install -y apache2-utils

# Run 10 concurrent requests
ab -n 10 -c 2 -p test_request.json -T application/json \
  http://localhost:8000/api/chat
```

---

## Test with Postman/Insomnia

### Import Collection

1. **Base URL:** `http://localhost:8000` or `https://ollama.ctrlchecks.ai`

2. **Endpoints:**
   - `GET /health`
   - `GET /`
   - `GET /api/tags`
   - `POST /api/chat`
   - `POST /api/generate`
   - `GET /api/video/info`

3. **Example Chat Request:**
   ```json
   {
     "model": "qwen2.5:14b-instruct-q4_K_M",
     "messages": [
       {"role": "user", "content": "Hello!"}
     ],
     "stream": false
   }
   ```

---

## Verify Service Status

```bash
# Check FastAPI service
sudo systemctl status fastapi-ollama

# Check Ollama service
sudo systemctl status ollama

# Check logs
sudo journalctl -u fastapi-ollama -n 20 --no-pager

# Check if port is listening
sudo netstat -tlnp | grep 8000
```

---

## Common Issues

### Connection Refused
```bash
# Check if service is running
sudo systemctl status fastapi-ollama

# Check if port is open
sudo lsof -i :8000
```

### Model Not Found
```bash
# List available models
ollama list

# Pull missing model
ollama pull qwen2.5:14b-instruct-q4_K_M
```

### CORS Errors
```bash
# Check .env file
cat /opt/fastapi-ollama/.env | grep ALLOWED_ORIGINS

# Restart service
sudo systemctl restart fastapi-ollama
```

---

## Quick Test Checklist

- [ ] Health endpoint returns 200
- [ ] Service info endpoint works
- [ ] Models list shows installed models
- [ ] Chat endpoint returns response
- [ ] Generate endpoint works
- [ ] Video info endpoint accessible
- [ ] API docs accessible at `/docs`
- [ ] No errors in logs
- [ ] Response times are reasonable

---

**Your API is ready to use!** 🚀
