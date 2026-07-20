# How to Check Logs for Debugging

## Frontend Logs (Browser)

### 1. Browser Console
- Press `F12` or `Right-click → Inspect`
- Go to **Console** tab
- Look for errors (red text)
- Look for network errors, CORS errors, timeout errors

### 2. Network Tab
- Press `F12` or `Right-click → Inspect`
- Go to **Network** tab
- Find the request that's stuck (usually `/api/generate-workflow` or `/api/ai/chatbot/message`)
- Click on it to see:
  - **Status**: 200, 504, etc.
  - **Time**: How long it's been running
  - **Response**: What the server returned

---

## Backend Logs (Server)

### SSH into Server
```bash
ssh -i ctrlchecks-worker-key.pem ubuntu@worker.ctrlchecks.ai
```

### 1. Real-time Backend Logs
```bash
# Watch logs in real-time (live updates)
sudo journalctl -u ctrlchecks-worker -f

# Press Ctrl+C to stop watching
```

### 2. Recent Backend Logs (Last 100 lines)
```bash
# View last 100 lines
sudo journalctl -u ctrlchecks-worker -n 100 --no-pager

# View last 50 lines with timestamps
sudo journalctl -u ctrlchecks-worker -n 50
```

### 3. Backend Logs with Errors Only
```bash
# Show only errors
sudo journalctl -u ctrlchecks-worker -p err -n 50

# Show errors and warnings
sudo journalctl -u ctrlchecks-worker -p warning -n 50
```

### 4. Backend Logs for Specific Time Period
```bash
# Logs from last 10 minutes
sudo journalctl -u ctrlchecks-worker --since "10 minutes ago"

# Logs from last hour
sudo journalctl -u ctrlchecks-worker --since "1 hour ago"

# Logs from today
sudo journalctl -u ctrlchecks-worker --since today
```

### 5. Search Backend Logs for Specific Terms
```bash
# Search for "error"
sudo journalctl -u ctrlchecks-worker | grep -i error

# Search for "timeout"
sudo journalctl -u ctrlchecks-worker | grep -i timeout

# Search for "generate-workflow"
sudo journalctl -u ctrlchecks-worker | grep -i "generate-workflow"

# Search for "chatbot"
sudo journalctl -u ctrlchecks-worker | grep -i chatbot
```

---

## Nginx Logs (Server)

### 1. Nginx Error Logs (Real-time)
```bash
# Watch Nginx errors in real-time
sudo tail -f /var/log/nginx/error.log

# Press Ctrl+C to stop
```

### 2. Recent Nginx Error Logs
```bash
# Last 50 lines of error log
sudo tail -n 50 /var/log/nginx/error.log

# Last 100 lines
sudo tail -n 100 /var/log/nginx/error.log
```

### 3. Nginx Access Logs
```bash
# Watch access logs in real-time
sudo tail -f /var/log/nginx/access.log

# Recent access logs
sudo tail -n 50 /var/log/nginx/access.log
```

### 4. Search Nginx Logs
```bash
# Search for timeout errors
sudo grep -i "timeout" /var/log/nginx/error.log

# Search for connection refused
sudo grep -i "connection refused" /var/log/nginx/error.log

# Search for 504 errors
sudo grep "504" /var/log/nginx/error.log
```

---

## Quick Diagnostic Commands

### Check if Backend is Running
```bash
# Check service status
sudo systemctl status ctrlchecks-worker

# Check if port 3001 is listening
sudo netstat -tlnp | grep 3001

# Test health endpoint locally
curl http://localhost:3001/health
```

### Check if Nginx is Running
```bash
# Check Nginx status
sudo systemctl status nginx

# Test Nginx configuration
sudo nginx -t

# Test from server
curl https://worker.ctrlchecks.ai/health
```

### Check System Resources
```bash
# Check memory usage
free -h

# Check disk space
df -h

# Check CPU usage
top -bn1 | head -20
```

---

## Common Issues and What to Look For

### Issue: Request Stuck on Loading
**Check:**
1. Browser console → Look for CORS errors or timeout errors
2. Backend logs → `sudo journalctl -u ctrlchecks-worker -f`
3. Nginx logs → `sudo tail -f /var/log/nginx/error.log`

**Look for:**
- `upstream timed out` in Nginx logs
- `Connection refused` in Nginx logs
- Errors in backend logs about processing

### Issue: 504 Gateway Timeout
**Check:**
- Nginx error log: `sudo tail -f /var/log/nginx/error.log`
- Look for: `upstream timed out (110: Connection timed out)`

**Fix:** Increase Nginx timeouts (already provided in config)

### Issue: CORS Errors
**Check:**
- Browser console → Look for "Access-Control-Allow-Origin" errors
- Backend logs → Check if CORS middleware is working

**Fix:** Update `ALLOWED_ORIGINS` in `.env` file

### Issue: Backend Not Responding
**Check:**
- Service status: `sudo systemctl status ctrlchecks-worker`
- Backend logs: `sudo journalctl -u ctrlchecks-worker -n 50`
- Local test: `curl http://localhost:3001/health`

---

## Quick Log Check Script

Save this as `check-logs.sh` on your server:

```bash
#!/bin/bash
echo "=== Backend Service Status ==="
sudo systemctl status ctrlchecks-worker --no-pager -l | head -20

echo ""
echo "=== Recent Backend Logs (Last 20 lines) ==="
sudo journalctl -u ctrlchecks-worker -n 20 --no-pager

echo ""
echo "=== Recent Nginx Errors (Last 10 lines) ==="
sudo tail -n 10 /var/log/nginx/error.log

echo ""
echo "=== Backend Health Check ==="
curl -s http://localhost:3001/health | head -5

echo ""
echo "=== Nginx Status ==="
sudo systemctl status nginx --no-pager -l | head -10
```

Make it executable and run:
```bash
chmod +x check-logs.sh
./check-logs.sh
```
