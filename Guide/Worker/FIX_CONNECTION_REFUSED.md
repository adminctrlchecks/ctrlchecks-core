# Fix ERR_CONNECTION_REFUSED Error

## 🔍 Root Cause Analysis

**Error:** `ERR_CONNECTION_REFUSED` when trying to connect to `https://3.7.115.58`

**Root Causes:**
1. **Backend server is not running** on the server
2. **Port 80 (HTTP) or 443 (HTTPS) is not open** in firewall
3. **Protocol mismatch**: Frontend using HTTPS but backend only serves HTTP
4. **Backend not listening on the correct interface** (only localhost, not 0.0.0.0)

---

## ✅ Step-by-Step Fix

### Step 1: Check if Backend is Running on Server

**SSH into your server:**
```bash
ssh -i your-key.pem ubuntu@3.7.115.58
```

**Check if backend process is running:**
```bash
# Check if Node.js process is running
ps aux | grep node

# Check if service is running
sudo systemctl status ctrlchecks-worker
# OR
sudo systemctl status worker

# Check if port 3001 is listening
sudo netstat -tlnp | grep 3001
# OR
sudo ss -tlnp | grep 3001
```

**If backend is NOT running, start it:**
```bash
# Navigate to worker directory
cd /opt/ctrlchecks-worker
[ -d "worker" ] && cd worker

# Start the service
sudo systemctl start ctrlchecks-worker
# OR if using PM2
pm2 start npm --name "worker" -- run start
# OR manually
npm run start
```

---

### Step 2: Check Firewall Rules

**Check if ports are open:**
```bash
# Check UFW status
sudo ufw status

# Check if port 80 (HTTP) is open
sudo ufw status | grep 80

# Check if port 443 (HTTPS) is open
sudo ufw status | grep 443

# Check if port 3001 (backend) is open
sudo ufw status | grep 3001
```

**If ports are closed, open them:**
```bash
# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Allow backend port (if accessing directly)
sudo ufw allow 3001/tcp

# Reload firewall
sudo ufw reload
```

**Check AWS Security Group:**
- Go to AWS Console → EC2 → Security Groups
- Find your instance's security group
- Ensure **Inbound Rules** allow:
  - Port 80 (HTTP) from `0.0.0.0/0`
  - Port 443 (HTTPS) from `0.0.0.0/0`
  - Port 3001 (if accessing directly) from your IP

---

### Step 3: Fix Protocol Mismatch (HTTP vs HTTPS)

**The Problem:**
- Your `.env.local` has: `VITE_API_URL=http://3.7.115.58` (HTTP)
- But frontend is trying: `https://3.7.115.58` (HTTPS)
- Backend might only be serving HTTP, not HTTPS

**Solution A: Use HTTP (Easier for Development)**

**On your local machine, edit `.env.local`:**
```bash
# In ctrl_checks/.env.local
VITE_API_URL=http://3.7.115.58
```

**Make sure it's HTTP, not HTTPS!**

**Restart Vite dev server:**
```bash
# Stop current server (Ctrl+C)
# Then restart
npm run dev
```

**Solution B: Set Up HTTPS on Server (Production)**

If you want to use HTTPS, you need to:
1. Set up SSL certificate (Let's Encrypt)
2. Configure nginx to serve HTTPS
3. Update frontend to use HTTPS

**See:** `Guide/Worker/DIAGNOSE_NGINX_SSL.md`

---

### Step 4: Check Backend is Listening on Correct Interface

**Check what interface backend is listening on:**
```bash
# On server
sudo netstat -tlnp | grep 3001
# OR
sudo ss -tlnp | grep 3001
```

**Should see:**
```
tcp  0  0  0.0.0.0:3001  0.0.0.0:*  LISTEN  node
```

**If you see `127.0.0.1:3001` instead of `0.0.0.0:3001`:**
- Backend is only listening on localhost
- External connections will be refused

**Fix: Check backend code listens on 0.0.0.0:**
```bash
# Check worker/src/index.ts
grep -n "app.listen\|server.listen" worker/src/index.ts
```

**Should see:**
```typescript
app.listen(port, '0.0.0.0', () => {
  // ...
});
```

**If it's listening on `localhost` or `127.0.0.1`, change to `0.0.0.0`**

---

### Step 5: Check Nginx Configuration (If Using Nginx)

**If you have nginx in front of backend:**

**Check nginx status:**
```bash
sudo systemctl status nginx
```

**Check nginx config:**
```bash
sudo cat /etc/nginx/sites-enabled/default
# OR
sudo cat /etc/nginx/sites-enabled/ctrlchecks-worker
```

**Verify nginx is proxying to backend:**
```nginx
location / {
    proxy_pass http://127.0.0.1:3001;  # Should point to backend
    # ...
}
```

**Test nginx config:**
```bash
sudo nginx -t
```

**If config is wrong, fix it and reload:**
```bash
sudo systemctl reload nginx
```

---

### Step 6: Test Connection from Server

**Test backend directly (bypass nginx):**
```bash
# On server
curl http://localhost:3001/health

# Should return JSON with status
```

**Test from server to external IP:**
```bash
# On server
curl http://3.7.115.58/health

# If this fails, backend isn't listening on 0.0.0.0
```

**Test from your local machine:**
```powershell
# From Windows PowerShell
Invoke-WebRequest -Uri "http://3.7.115.58/health" -UseBasicParsing

# Should return JSON, not connection refused
```

---

### Step 7: Verify Frontend Configuration

**Check `.env.local` file:**
```bash
# In ctrl_checks/.env.local
cat .env.local | grep VITE_API_URL
```

**Should be:**
```env
VITE_API_URL=http://3.7.115.58
```

**NOT:**
```env
VITE_API_URL=https://3.7.115.58  # ❌ Wrong if backend is HTTP
```

**Clear browser cache and restart Vite:**
```bash
# Stop Vite (Ctrl+C)
# Clear browser cache (Ctrl+Shift+Delete)
# Restart Vite
npm run dev
```

---

## 🐛 Debugging Commands

### On Server

```bash
# 1. Check if backend is running
sudo systemctl status ctrlchecks-worker

# 2. Check what's listening on ports
sudo lsof -i :3001
sudo lsof -i :80
sudo lsof -i :443

# 3. Check backend logs
sudo journalctl -u ctrlchecks-worker -n 50 -f

# 4. Test backend directly
curl -v http://localhost:3001/health

# 5. Check firewall
sudo ufw status verbose

# 6. Check nginx (if using)
sudo nginx -t
sudo systemctl status nginx
```

### On Local Machine

```powershell
# 1. Test HTTP connection
Invoke-WebRequest -Uri "http://3.7.115.58/health" -UseBasicParsing

# 2. Test HTTPS connection (if using HTTPS)
Invoke-WebRequest -Uri "https://3.7.115.58/health" -UseBasicParsing

# 3. Check if port is reachable
Test-NetConnection -ComputerName 3.7.115.58 -Port 80
Test-NetConnection -ComputerName 3.7.115.58 -Port 443
Test-NetConnection -ComputerName 3.7.115.58 -Port 3001
```

---

## ✅ Verification Checklist

After fixing, verify:

- [ ] Backend service is running: `sudo systemctl status ctrlchecks-worker`
- [ ] Port 3001 is listening: `sudo netstat -tlnp | grep 3001`
- [ ] Port 80/443 is open in firewall: `sudo ufw status`
- [ ] AWS Security Group allows ports 80/443
- [ ] Backend listens on `0.0.0.0`, not `127.0.0.1`
- [ ] `.env.local` has `VITE_API_URL=http://3.7.115.58` (HTTP, not HTTPS)
- [ ] Vite dev server restarted after `.env.local` change
- [ ] Browser cache cleared
- [ ] `curl http://3.7.115.58/health` works from local machine
- [ ] Frontend console shows `http://3.7.115.58` (not HTTPS)

---

## 🚨 Common Issues

### Issue: Backend Starts But Immediately Crashes

**Check logs:**
```bash
sudo journalctl -u ctrlchecks-worker -n 100
```

**Common causes:**
- Missing environment variables
- Database connection failed
- Port already in use
- Missing dependencies

### Issue: Port 3001 Works But Port 80/443 Doesn't

**This means:**
- Backend is running
- But nginx isn't configured or running
- Or firewall is blocking 80/443

**Fix:**
- Set up nginx reverse proxy
- Or access backend directly via port 3001 (not recommended for production)

### Issue: Works from Server But Not from Local Machine

**This means:**
- Backend is running
- But firewall or security group is blocking external access

**Fix:**
- Open ports in UFW: `sudo ufw allow 80/tcp`
- Open ports in AWS Security Group

### Issue: Frontend Still Uses HTTPS Even After Changing .env.local

**Possible causes:**
1. Browser cached the old URL
2. Vite didn't pick up the change
3. Another env file is overriding it

**Fix:**
```bash
# 1. Stop Vite completely
# 2. Delete .env.local and recreate it
# 3. Make sure VITE_API_URL=http://3.7.115.58 (HTTP)
# 4. Restart Vite
npm run dev
# 5. Hard refresh browser (Ctrl+Shift+R)
```

---

## 📝 Quick Fix Summary

**If backend is not running:**
```bash
cd /opt/ctrlchecks-worker/worker
sudo systemctl start ctrlchecks-worker
```

**If firewall is blocking:**
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

**If protocol mismatch:**
```bash
# Edit ctrl_checks/.env.local
VITE_API_URL=http://3.7.115.58  # Use HTTP, not HTTPS

# Restart Vite
npm run dev
```

**If backend only listens on localhost:**
```typescript
// In worker/src/index.ts
app.listen(port, '0.0.0.0', () => {  // Not 'localhost' or '127.0.0.1'
  // ...
});
```

---

## 🔍 Still Not Working?

**Run full diagnostic:**
```bash
# On server
echo "=== Backend Status ==="
sudo systemctl status ctrlchecks-worker --no-pager

echo "=== Port Status ==="
sudo netstat -tlnp | grep -E "3001|80|443"

echo "=== Firewall Status ==="
sudo ufw status verbose

echo "=== Backend Logs ==="
sudo journalctl -u ctrlchecks-worker -n 20 --no-pager

echo "=== Test Backend ==="
curl -v http://localhost:3001/health
```

**Share the output to debug further.**
