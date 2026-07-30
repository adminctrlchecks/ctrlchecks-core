#!/usr/bin/env bash
# deploy-ai-generator.sh — Build and deploy the AI Generator service to production.
#
# Usage:
#   ./scripts/deploy-ai-generator.sh
#
# Prerequisites:
#   - services/ai-generator/.env must exist on the server at /opt/ctrlchecks-ai-generator/.env
#   - SSH key at Guide/Worker/ctrlchecks-backend.pem
#   - On first deploy: run Task 5.1 server setup commands below
#
# First-deploy server setup (one-time, SSH in and run):
#   sudo mkdir -p /opt/ctrlchecks-ai-generator
#   sudo chown -R ubuntu:ubuntu /opt/ctrlchecks-ai-generator
#   sudo cp /opt/ctrlchecks-worker/scripts/ctrlchecks-ai-generator.service \
#           /etc/systemd/system/ctrlchecks-ai-generator.service
#   sudo systemctl daemon-reload
#   sudo systemctl enable ctrlchecks-ai-generator
#   # Then create /opt/ctrlchecks-ai-generator/.env (copy from .env.example, fill values)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_DIR="$REPO_ROOT/services/ai-generator"
SERVER_USER="root"
SERVER_HOST="187.127.185.105"
SERVER_PATH="/opt/ctrlchecks-ai-generator"
SSH_KEY="${DEPLOY_KEY:-$HOME/.ssh/id_ed25519}"
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no -o ConnectTimeout=15"

# ── 1. Prerequisites check ────────────────────────────────────────────────────
if [[ ! -f "$SSH_KEY" ]]; then
  echo "❌ SSH key not found at $SSH_KEY" >&2
  exit 1
fi

# ── 2. Type-check ─────────────────────────────────────────────────────────────
echo "▶ Type-checking ai-generator…"
cd "$SERVICE_DIR"
npm run type-check
echo "✅ Type-check passed"

# ── 3. Build ──────────────────────────────────────────────────────────────────
echo "▶ Building ai-generator…"
npm run build
echo "✅ Build complete: $(du -sh dist | cut -f1) in dist/"

# ── 4. Package (only what the server needs) ───────────────────────────────────
echo "▶ Packaging dist + package files…"
TMP_TAR="/tmp/ai-generator-$(date +%s).tar.gz"
tar -czf "$TMP_TAR" \
  dist/ \
  package.json \
  package-lock.json
echo "✅ Package: $(du -sh "$TMP_TAR" | cut -f1)"

# ── 5. Upload ─────────────────────────────────────────────────────────────────
echo "▶ Uploading to $SERVER_USER@$SERVER_HOST:$SERVER_PATH …"
scp $SSH_OPTS "$TMP_TAR" "$SERVER_USER@$SERVER_HOST:/tmp/ai-generator-deploy.tar.gz"
rm "$TMP_TAR"

# ── 6. Extract, install, restart ─────────────────────────────────────────────
echo "▶ Extracting and restarting service…"
ssh $SSH_OPTS "$SERVER_USER@$SERVER_HOST" bash <<'REMOTE'
  set -euo pipefail
  TARGET=/opt/ctrlchecks-ai-generator

  # Extract (preserve .env — not in tar)
  tar -xzf /tmp/ai-generator-deploy.tar.gz -C "$TARGET"
  rm /tmp/ai-generator-deploy.tar.gz

  # Install production deps only
  cd "$TARGET"
  npm ci --omit=dev

  # Restart
  sudo systemctl restart ctrlchecks-ai-generator
  sleep 5

  # Verify
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/health)
  if [[ "$STATUS" == "200" ]]; then
    echo "✅ ai-generator healthy on :3002 (HTTP $STATUS)"
  else
    echo "❌ Health check failed: HTTP $STATUS" >&2
    sudo journalctl -u ctrlchecks-ai-generator -n 20 --no-pager >&2
    exit 1
  fi
REMOTE

echo ""
echo "────────────────────────────────────────────────────────────────"
echo "AI Generator deployed and running on :3002"
echo ""
echo "Test delegation from worker:"
echo "  curl -s https://worker.ctrlchecks.ai/health | python3 -m json.tool"
echo ""
echo "If AI_GENERATOR_URL is set in worker .env, stage calls now delegate"
echo "to ai-generator with automatic fallback on failure."
echo "────────────────────────────────────────────────────────────────"
