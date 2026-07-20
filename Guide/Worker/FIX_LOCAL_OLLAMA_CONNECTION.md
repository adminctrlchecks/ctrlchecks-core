# Fix: Local Ollama Connection Error

## Problem

When running the worker backend locally, you see this error:

```
❌ Failed to connect to Ollama: TypeError: fetch failed
Error: getaddrinfo ENOTFOUND ollama.ctrlchecks.ai
```

**Root Cause:**
- The local Windows machine cannot resolve the DNS name `ollama.ctrlchecks.ai`
- The DNS record exists in AWS Route 53, but your local machine can't access it
- The worker is trying to connect to `http://ollama.ctrlchecks.ai:8000` but DNS lookup fails

---

## Solution Options

### Option 1: Use Direct IP Address (Quick Fix)

**For local development, use the Elastic IP directly instead of the domain name.**

1. **Find the Elastic IP:**
   - From previous setup: `13.232.155.30`
   - Or check AWS Console → EC2 → Elastic IPs

2. **Create/Update `.env` file in `worker/` directory:**

```env
# Use direct IP for local development
FASTAPI_OLLAMA_URL=http://ollama.ctrlchecks.ai:8000
PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000
```

3. **Restart the worker:**
   ```bash
   # Stop current process (Ctrl+C)
   # Then restart
   npm run dev
   ```

**Pros:** Works immediately, no DNS needed  
**Cons:** IP might change if Elastic IP is released

---

### Option 2: Add to Windows Hosts File (Permanent Fix)

**Map the domain name to the IP address on your local machine.**

1. **Open Notepad as Administrator:**
   - Press `Win + X`
   - Select "Windows Terminal (Admin)" or "Command Prompt (Admin)"
   - Or right-click Notepad → "Run as administrator"

2. **Open hosts file:**
   - File → Open
   - Navigate to: `C:\Windows\System32\drivers\etc\`
   - Change file type to "All Files (*.*)"
   - Open `hosts`

3. **Add this line at the end:**
   ```
   13.232.155.30    ollama.ctrlchecks.ai
   ```

4. **Save the file**

5. **Flush DNS cache:**
   ```powershell
   ipconfig /flushdns
   ```

6. **Test DNS resolution:**
   ```powershell
   ping ollama.ctrlchecks.ai
   # Should show: Pinging ollama.ctrlchecks.ai [13.232.155.30]
   ```

7. **Restart the worker:**
   ```bash
   npm run dev
   ```

**Pros:** Works with domain name, permanent  
**Cons:** Requires admin access, needs update if IP changes

---

### Option 3: Make Connection Optional for Local Dev (Best Practice)

**Make Ollama connection optional so the server can start even if Ollama is unavailable.**

The code already handles this gracefully (server starts but AI features are unavailable), but you can improve it:

1. **Update `.env` for local development:**

```env
# Local development - use direct IP or skip if not needed
FASTAPI_OLLAMA_URL=http://ollama.ctrlchecks.ai:8000
# Or comment out to skip Ollama initialization:
# FASTAPI_OLLAMA_URL=

# For production, use domain:
# FASTAPI_OLLAMA_URL=http://ollama.ctrlchecks.ai:8000
```

2. **The server will start anyway:**
   - You'll see warnings about Ollama being unavailable
   - Server still runs on port 3001
   - Other features work (workflow execution, etc.)
   - Only AI features are unavailable

---

## Recommended Setup

### For Local Development

**File: `worker/.env`** (create if doesn't exist)

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Ollama - Use direct IP for local dev
FASTAPI_OLLAMA_URL=http://ollama.ctrlchecks.ai:8000
PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000

# Server
PORT=3001
PUBLIC_BASE_URL=http://localhost:3001

# CORS (for local frontend)
CORS_ORIGIN=http://localhost:8080,http://localhost:5173
ALLOWED_ORIGINS=http://localhost:8080,http://localhost:5173,http://127.0.0.1:8080

# Logging
LOG_LEVEL=INFO
```

### For Production (AWS Server)

**File: `/opt/ctrlchecks-worker/.env`** (on AWS server)

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Ollama - Use domain name (DNS works on AWS)
FASTAPI_OLLAMA_URL=http://ollama.ctrlchecks.ai:8000
PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000

# Server
PORT=3001
PUBLIC_BASE_URL=https://worker.ctrlchecks.ai

# CORS (for production frontend)
CORS_ORIGIN=https://ctrlchecks.ai,https://www.ctrlchecks.ai
ALLOWED_ORIGINS=https://ctrlchecks.ai,https://www.ctrlchecks.ai,https://*.vercel.app

# Logging
LOG_LEVEL=INFO
```

---

## Quick Fix Commands

### Option 1: Use Direct IP (Copy-paste)

```powershell
# Navigate to worker directory
cd worker

# Create/update .env file
@"
FASTAPI_OLLAMA_URL=http://ollama.ctrlchecks.ai:8000
PYTHON_BACKEND_URL=http://ollama.ctrlchecks.ai:8000
"@ | Out-File -FilePath .env -Encoding utf8

# Restart worker
npm run dev
```

### Option 2: Add to Hosts File (Copy-paste in Admin PowerShell)

```powershell
# Run as Administrator
$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$entry = "13.232.155.30    ollama.ctrlchecks.ai"

# Check if entry already exists
$hostsContent = Get-Content $hostsPath
if ($hostsContent -notcontains $entry) {
    Add-Content -Path $hostsPath -Value "`n$entry"
    Write-Host "✅ Added to hosts file"
} else {
    Write-Host "ℹ️  Entry already exists"
}

# Flush DNS
ipconfig /flushdns
Write-Host "✅ DNS cache flushed"
```

---

## Verify Fix

### Test 1: Check DNS Resolution

```powershell
# Should resolve to IP
Resolve-DnsName ollama.ctrlchecks.ai
# Or
ping ollama.ctrlchecks.ai
```

### Test 2: Check Ollama Health

```powershell
# Should return JSON with status
curl http://ollama.ctrlchecks.ai:8000/health
# Or with IP
curl http://ollama.ctrlchecks.ai:8000/health
```

### Test 3: Check Worker Logs

After restarting the worker, you should see:
```
✅ Ollama connected at http://ollama.ctrlchecks.ai:8000
📦 Loaded models: qwen2.5:14b-instruct-q4_K_M, ...
```

Instead of:
```
❌ Failed to connect to Ollama
```

---

## Troubleshooting

### Still getting DNS error?

1. **Check hosts file was saved correctly:**
   ```powershell
   Get-Content C:\Windows\System32\drivers\etc\hosts | Select-String "ollama"
   ```

2. **Verify IP is correct:**
   - Check AWS Console → EC2 → Elastic IPs
   - Make sure it's associated with the GPU instance

3. **Test direct IP connection:**
   ```powershell
   curl http://ollama.ctrlchecks.ai:8000/health
   ```
   - If this works, DNS is the issue
   - If this fails, network/firewall is the issue

### Connection timeout?

1. **Check security group:**
   - AWS Console → EC2 → Security Groups
   - Make sure port 8000 is open for your IP

2. **Check if FastAPI service is running:**
   - SSH to GPU instance
   - Check service status: `sudo systemctl status ctrlchecks-fastapi`

### Server starts but AI features don't work?

This is expected if Ollama connection fails. The server will:
- ✅ Start successfully
- ✅ Handle non-AI requests
- ⚠️ Show warnings about Ollama being unavailable
- ❌ AI features (chatbot, workflow generation) won't work

**To fix:** Use one of the solutions above to connect to Ollama.

---

## Summary

**Quick Fix (Recommended for Local Dev):**
1. Use direct IP in `.env`: `FASTAPI_OLLAMA_URL=http://ollama.ctrlchecks.ai:8000`
2. Restart worker

**Permanent Fix:**
1. Add to Windows hosts file: `13.232.155.30    ollama.ctrlchecks.ai`
2. Flush DNS: `ipconfig /flushdns`
3. Restart worker

**The server will work either way, but AI features need Ollama connection!** ✅
