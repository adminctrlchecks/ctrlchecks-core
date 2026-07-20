# Setup Domain and SSL for ollama.ctrlchecks.ai

**Guide to configure nginx reverse proxy and SSL certificate for your FastAPI Ollama service**

---

## Prerequisites

- ✅ Route 53 domain configured: `ollama.ctrlchecks.ai` → EC2 IP
- ✅ EC2 instance running FastAPI on port 8000
- ✅ Port 80 and 443 open in security group

---

## Step 1: Install Nginx

```bash
# Install nginx
sudo apt update
sudo apt install -y nginx

# Check nginx version
nginx -v

# Start and enable nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

**✅ Checkpoint:** Nginx installed and running

---

## Step 2: Configure Nginx Reverse Proxy

```bash
# Create nginx configuration
sudo nano /etc/nginx/sites-available/ollama.ctrlchecks.ai
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name ollama.ctrlchecks.ai;

    # Logging
    access_log /var/log/nginx/ollama-access.log;
    error_log /var/log/nginx/ollama-error.log;

    # Increase timeouts for long-running requests
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    send_timeout 300s;

    # Increase body size for file uploads
    client_max_body_size 100M;

    # Proxy to FastAPI
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket support (if needed)
        proxy_set_header Sec-WebSocket-Extensions $http_sec_websocket_extensions;
        proxy_set_header Sec-WebSocket-Key $http_sec_websocket_key;
        proxy_set_header Sec-WebSocket-Version $http_sec_websocket_version;
    }
}
```

Save: `Ctrl+X`, then `Y`, then `Enter`

### Enable the site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/ollama.ctrlchecks.ai /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

**✅ Checkpoint:** Nginx configured and running

---

## Step 3: Install Certbot (Let's Encrypt)

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

**✅ Checkpoint:** Certbot installed

---

## Step 4: Obtain SSL Certificate

```bash
# Get SSL certificate (automatically configures nginx)
sudo certbot --nginx -d ollama.ctrlchecks.ai

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)
```

**✅ Checkpoint:** SSL certificate obtained

---

## Step 5: Verify SSL Auto-Renewal

```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Check certbot timer
sudo systemctl status certbot.timer
```

**✅ Checkpoint:** SSL auto-renewal configured

---

## Step 6: Update FastAPI CORS Settings

```bash
# Edit .env file
cd /opt/fastapi-ollama
nano .env
```

Update `ALLOWED_ORIGINS`:

```bash
ALLOWED_ORIGINS=https://ctrlchecks.ai,https://app.ctrlchecks.ai,https://ollama.ctrlchecks.ai
```

Or for testing:

```bash
ALLOWED_ORIGINS=*
```

Save and restart:

```bash
# Restart FastAPI service
sudo systemctl restart fastapi-ollama
```

**✅ Checkpoint:** CORS updated

---

## Step 7: Configure Firewall

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Reload firewall
sudo ufw reload

# Check status
sudo ufw status
```

**✅ Checkpoint:** Firewall configured

---

## Step 8: Test Deployment

### Test HTTP (should redirect to HTTPS)

```bash
curl -I http://ollama.ctrlchecks.ai/health
```

### Test HTTPS

```bash
curl https://ollama.ctrlchecks.ai/health
```

### Test from browser

Open: `https://ollama.ctrlchecks.ai/`

Should see FastAPI service info.

---

## Step 9: Update Nginx for Production

After SSL is configured, nginx config will be updated automatically. Check it:

```bash
sudo cat /etc/nginx/sites-available/ollama.ctrlchecks.ai
```

Should show SSL configuration with:
- `listen 443 ssl;`
- SSL certificate paths
- HTTP to HTTPS redirect

---

## Troubleshooting

### Nginx won't start

```bash
# Check configuration
sudo nginx -t

# Check logs
sudo tail -f /var/log/nginx/error.log

# Check if port 80/443 is in use
sudo lsof -i :80
sudo lsof -i :443
```

### SSL certificate issues

```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew

# Check nginx SSL config
sudo nginx -t
```

### FastAPI not accessible

```bash
# Check FastAPI is running
sudo systemctl status fastapi-ollama

# Check nginx can reach FastAPI
curl http://localhost:8000/health

# Check nginx logs
sudo tail -f /var/log/nginx/ollama-error.log
```

### CORS errors

```bash
# Check .env file
cat /opt/fastapi-ollama/.env | grep ALLOWED_ORIGINS

# Restart FastAPI
sudo systemctl restart fastapi-ollama
```

---

## Quick Commands Reference

```bash
# Nginx
sudo systemctl status nginx
sudo systemctl restart nginx
sudo nginx -t
sudo tail -f /var/log/nginx/ollama-error.log

# Certbot
sudo certbot certificates
sudo certbot renew
sudo certbot renew --dry-run

# FastAPI
sudo systemctl status fastapi-ollama
sudo systemctl restart fastapi-ollama
sudo journalctl -u fastapi-ollama -f
```

---

## Final Configuration Summary

After setup, you'll have:

- ✅ Nginx reverse proxy on port 80/443
- ✅ SSL certificate (Let's Encrypt)
- ✅ Auto-renewal configured
- ✅ HTTP → HTTPS redirect
- ✅ FastAPI accessible at `https://ollama.ctrlchecks.ai`
- ✅ CORS configured for your domains

---

## Test Endpoints

```bash
# Health check
curl https://ollama.ctrlchecks.ai/health

# Service info
curl https://ollama.ctrlchecks.ai/

# List models
curl https://ollama.ctrlchecks.ai/api/tags

# Chat (example)
curl -X POST https://ollama.ctrlchecks.ai/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5:14b-instruct-q4_K_M",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'
```

---

**Your service will be accessible at:** `https://ollama.ctrlchecks.ai`
