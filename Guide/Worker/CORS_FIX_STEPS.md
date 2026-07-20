# CORS Fix - Step by Step Instructions

## ⚠️ Current Problem

Backend is still returning `http://localhost:5173` instead of `https://www.ctrlchecks.ai`

**This means the .env file on the server hasn't been updated yet.**

---

## 🔧 Fix Steps (Copy-Paste Ready)

### Step 1: SSH into Worker Backend

```bash
ssh -i your-key.pem ubuntu@worker.ctrlchecks.ai
```

**Replace `your-key.pem` with your actual key file name.**

---

### Step 2: Navigate to Application Directory

```bash
cd /opt/ctrlchecks-worker
```

**Check if there's a 'worker' subdirectory:**
```bash
ls -la
```

**If you see a `worker` folder, go into it:**
```bash
cd worker
```

**Verify you're in the right place:**
```bash
pwd
# Should show: /opt/ctrlchecks-worker or /opt/ctrlchecks-worker/worker

ls -la .env
# Should show the .env file exists
```

---

### Step 3: Check Current CORS Configuration

```bash
cat .env | grep -E "CORS_ORIGIN|ALLOWED_ORIGINS"
```

**You'll probably see:**
```
CORS_ORIGIN=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
```

---

### Step 4: Update .env File

**Option A: Using nano (Recommended)**

```bash
nano .env
```

**Find these lines:**
```
CORS_ORIGIN=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
```

**Replace with:**
```
CORS_ORIGIN=https://ctrlchecks.ai,https://www.ctrlchecks.ai
ALLOWED_ORIGINS=https://ctrlchecks.ai,https://www.ctrlchecks.ai,https://*.vercel.app,http://localhost:5173,http://localhost:8080
```

**Save:**
- Press `Ctrl + X`
- Press `Y` (yes)
- Press `Enter`

**Option B: Using sed (Quick)**

```bash
# Update CORS_ORIGIN
sed -i 's|^CORS_ORIGIN=.*|CORS_ORIGIN=https://ctrlchecks.ai,https://www.ctrlchecks.ai|' .env

# Update ALLOWED_ORIGINS
sed -i 's|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://ctrlchecks.ai,https://www.ctrlchecks.ai,https://*.vercel.app,http://localhost:5173,http://localhost:8080|' .env

# Verify changes
cat .env | grep -E "CORS_ORIGIN|ALLOWED_ORIGINS"
```

---

### Step 5: Verify .env File Was Updated

```bash
cat .env | grep -E "CORS_ORIGIN|ALLOWED_ORIGINS"
```

**Should show:**
```
CORS_ORIGIN=https://ctrlchecks.ai,https://www.ctrlchecks.ai
ALLOWED_ORIGINS=https://ctrlchecks.ai,https://www.ctrlchecks.ai,https://*.vercel.app,http://localhost:5173,http://localhost:8080
```

**If it still shows `http://localhost:5173`, the file wasn't updated. Try again.**

---

### Step 6: Restart Worker Service

```bash
# Restart the service
sudo systemctl restart ctrlchecks-worker

# Wait a few seconds
sleep 3

# Check status
sudo systemctl status ctrlchecks-worker
```

**Should show:**
```
● ctrlchecks-worker.service - CtrlChecks Worker Service
   Loaded: loaded
   Active: active (running)
```

---

### Step 7: Verify Service is Reading New Config

```bash
# Check service logs for CORS configuration
sudo journalctl -u ctrlchecks-worker -n 50 | grep -i cors
```

**You should see logs showing the service started with new config.**

---

### Step 8: Test CORS from Server

```bash
# Test health endpoint
curl -H "Origin: https://www.ctrlchecks.ai" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://localhost:3001/health \
     -v 2>&1 | grep -i "access-control"
```

**Should show:**
```
< Access-Control-Allow-Origin: https://www.ctrlchecks.ai
```

**If it still shows `http://localhost:5173`, the service didn't pick up the changes. Check:**
1. Is the .env file in the correct location?
2. Did you restart the service?
3. Check service logs for errors

---

### Step 9: Test from Your Browser

1. **Open:** `https://www.ctrlchecks.ai`
2. **Open browser console:** Press F12
3. **Check Network tab:**
   - Look for `/health` request
   - Should show `200 OK` (not CORS error)
4. **Check Console tab:**
   - Should NOT see CORS errors

---

## 🔍 Troubleshooting

### Issue: Service won't restart

**Check logs:**
```bash
sudo journalctl -u ctrlchecks-worker -n 100 --no-pager
```

**Common causes:**
- Syntax error in .env file
- Missing required variables
- Port already in use

**Fix:**
```bash
# Check .env syntax
cat .env | grep -v "^#" | grep -v "^$" | head -20

# Check if port is in use
sudo netstat -tlnp | grep 3001

# Try starting manually to see errors
cd /opt/ctrlchecks-worker
[ -d "worker" ] && cd worker
node dist/index.js
# (Press Ctrl+C to stop)
```

### Issue: .env file not found

**Find the correct location:**
```bash
# Search for .env file
sudo find /opt/ctrlchecks-worker -name ".env" -type f

# Check service configuration
sudo systemctl cat ctrlchecks-worker | grep -i env
```

**The .env file should be in the same directory as `dist/index.js`**

### Issue: Changes not taking effect

**Verify service is using .env:**
```bash
# Check service file
sudo cat /etc/systemd/system/ctrlchecks-worker.service

# Should have EnvironmentFile line pointing to .env
```

**If missing, update service file:**
```bash
sudo nano /etc/systemd/system/ctrlchecks-worker.service
```

**Add this line in [Service] section:**
```ini
EnvironmentFile=/opt/ctrlchecks-worker/.env
# OR if in worker subdirectory:
EnvironmentFile=/opt/ctrlchecks-worker/worker/.env
```

**Then:**
```bash
sudo systemctl daemon-reload
sudo systemctl restart ctrlchecks-worker
```

### Issue: Still getting CORS errors

**Check what origins are actually configured:**
```bash
# Check environment variables
sudo systemctl show ctrlchecks-worker | grep -i cors

# Check service logs
sudo journalctl -u ctrlchecks-worker -n 100 | grep -i "allowed origins"
```

**Force reload:**
```bash
# Stop service
sudo systemctl stop ctrlchecks-worker

# Wait
sleep 2

# Start service
sudo systemctl start ctrlchecks-worker

# Check status
sudo systemctl status ctrlchecks-worker
```

---

## ✅ Verification Checklist

After completing the steps:

- [ ] .env file updated with production domains
- [ ] Service restarted successfully
- [ ] Service status shows "active (running)"
- [ ] No errors in service logs
- [ ] CORS test from server shows correct origin
- [ ] Browser console shows no CORS errors
- [ ] API calls work from frontend

---

## 📝 Complete Command Sequence

**Copy and paste this entire sequence:**

```bash
# 1. Navigate to app
cd /opt/ctrlchecks-worker
[ -d "worker" ] && cd worker

# 2. Check current config
echo "Current CORS config:"
cat .env | grep -E "CORS_ORIGIN|ALLOWED_ORIGINS"

# 3. Update CORS
sed -i 's|^CORS_ORIGIN=.*|CORS_ORIGIN=https://ctrlchecks.ai,https://www.ctrlchecks.ai|' .env
sed -i 's|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://ctrlchecks.ai,https://www.ctrlchecks.ai,https://*.vercel.app,http://localhost:5173,http://localhost:8080|' .env

# 4. Verify update
echo "Updated CORS config:"
cat .env | grep -E "CORS_ORIGIN|ALLOWED_ORIGINS"

# 5. Restart service
sudo systemctl restart ctrlchecks-worker

# 6. Wait and check status
sleep 3
sudo systemctl status ctrlchecks-worker --no-pager -l | head -15

# 7. Test locally
curl -H "Origin: https://www.ctrlchecks.ai" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://localhost:3001/health \
     -v 2>&1 | grep -i "access-control"
```

---

## 🎯 Expected Result

After completing these steps:

1. **Browser console:** No CORS errors
2. **Network tab:** API calls return `200 OK`
3. **Frontend:** Can communicate with backend
4. **Chatbot:** Works properly

---

**If you still see CORS errors after these steps, share the output of:**
```bash
cat .env | grep -E "CORS_ORIGIN|ALLOWED_ORIGINS"
sudo systemctl status ctrlchecks-worker --no-pager -l | head -20
```
