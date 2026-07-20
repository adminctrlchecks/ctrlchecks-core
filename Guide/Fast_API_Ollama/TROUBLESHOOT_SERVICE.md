# Troubleshoot FastAPI Service - Port 8000 Not Responding

**Service shows as running but curl fails - here's how to fix it**

---

## Quick Fix Steps

### Step 1: Check Service Logs

```bash
# View recent logs
sudo journalctl -u fastapi-ollama -n 50 --no-pager

# Or follow logs in real-time
sudo journalctl -u fastapi-ollama -f
```

**Look for errors like:**
- Import errors
- Missing .env file
- Port already in use
- Python errors

---

### Step 2: Verify .env File Exists

```bash
# Check if .env file exists
ls -la /opt/fastapi-ollama/.env

# If missing, create it
cd /opt/fastapi-ollama
cp env.example .env
chmod 600 .env
```

---

### Step 3: Check if Port is Actually Listening

```bash
# Check if port 8000 is listening
sudo netstat -tlnp | grep 8000

# Or
sudo ss -tlnp | grep 8000

# If nothing shows, service isn't actually running
```

---

### Step 4: Restart Service

```bash
# Restart the service
sudo systemctl restart fastapi-ollama

# Wait a few seconds
sleep 3

# Check status
sudo systemctl status fastapi-ollama

# Test again
curl http://localhost:8000/health
```

---

### Step 5: Test Manually (If Service Fails)

```bash
# Activate venv
cd /opt/fastapi-ollama
source venv/bin/activate

# Try running manually
python main.py

# Or
uvicorn main:app --host 0.0.0.0 --port 8000

# This will show you the actual error
```

---

## Common Issues and Fixes

### Issue 1: Missing .env File

**Error in logs:** `FileNotFoundError: .env`

**Fix:**
```bash
cd /opt/fastapi-ollama
cp env.example .env
chmod 600 .env
sudo systemctl restart fastapi-ollama
```

---

### Issue 2: Import Error (ltx_client)

**Error in logs:** `ModuleNotFoundError: No module named 'ltx_client'`

**Fix:**
```bash
cd /opt/fastapi-ollama
source venv/bin/activate
# Check if ltx_client.py exists
ls -la ltx_client.py
# If missing, pull from git
git pull origin main
sudo systemctl restart fastapi-ollama
```

---

### Issue 3: Port Already in Use

**Error in logs:** `Address already in use`

**Fix:**
```bash
# Find process using port 8000
sudo lsof -i :8000

# Kill the process
sudo kill -9 <PID>

# Or change port in .env
nano /opt/fastapi-ollama/.env
# Change PORT=8000 to PORT=8001
sudo systemctl restart fastapi-ollama
```

---

### Issue 4: Python Path Issue

**Error in logs:** `python3.11: command not found`

**Fix:**
```bash
# Check Python path in service file
cat /etc/systemd/system/fastapi-ollama.service | grep ExecStart

# Verify Python exists
which python3.11
/usr/bin/python3.11 --version

# If path is wrong, update service file
```

---

## Complete Diagnostic Commands

Run these to diagnose:

```bash
# 1. Check service status
sudo systemctl status fastapi-ollama --no-pager -l

# 2. Check logs
sudo journalctl -u fastapi-ollama -n 50 --no-pager

# 3. Check if .env exists
ls -la /opt/fastapi-ollama/.env

# 4. Check if port is listening
sudo netstat -tlnp | grep 8000

# 5. Check if process is running
ps aux | grep uvicorn

# 6. Test manually
cd /opt/fastapi-ollama
source venv/bin/activate
python -c "import main; print('Import OK')"
```

---

## Quick Restart Sequence

```bash
# Stop service
sudo systemctl stop fastapi-ollama

# Check logs
sudo journalctl -u fastapi-ollama -n 50 --no-pager

# Fix any issues found

# Start service
sudo systemctl start fastapi-ollama

# Wait
sleep 5

# Check status
sudo systemctl status fastapi-ollama

# Test
curl http://localhost:8000/health
```
