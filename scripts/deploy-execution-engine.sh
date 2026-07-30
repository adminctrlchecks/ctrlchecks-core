#!/usr/bin/env bash
# deploy-execution-engine.sh — Build and deploy the Execution Engine service to production.
#
# Usage:
#   ./scripts/deploy-execution-engine.sh
#
# First-deploy server setup (one-time, SSH in and run):
#   sudo mkdir -p /opt/ctrlchecks-execution-engine
#   sudo chown -R ubuntu:ubuntu /opt/ctrlchecks-execution-engine
#   sudo cp /opt/ctrlchecks-worker/scripts/ctrlchecks-execution-engine.service \
#           /etc/systemd/system/ctrlchecks-execution-engine.service
#   sudo systemctl daemon-reload
#   sudo systemctl enable ctrlchecks-execution-engine
#   # Create /opt/ctrlchecks-execution-engine/.env (copy from .env.example, fill values)
#
# Prerequisites:
#   - services/execution-engine/ with built code
#   - SSH key at Guide/Worker/ctrlchecks-backend.pem
#   - Server: ubuntu@3.7.115.58, service at /opt/ctrlchecks-execution-engine/

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_DIR="$REPO_ROOT/services/execution-engine"
SERVER_USER="root"
SERVER_HOST="187.127.185.105"
SERVER_PATH="/opt/ctrlchecks-execution-engine"
SSH_KEY="${DEPLOY_KEY:-$HOME/.ssh/id_ed25519}"
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no -o ConnectTimeout=15"

# ── 1. Prerequisites check ────────────────────────────────────────────────────
if [[ ! -f "$SSH_KEY" ]]; then
  echo "❌ SSH key not found at $SSH_KEY" >&2
  exit 1
fi

if [[ ! -d "$SERVICE_DIR" ]]; then
  echo "❌ Service directory not found: $SERVICE_DIR" >&2
  exit 1
fi

# ── 2. Type-check ─────────────────────────────────────────────────────────────
echo "▶ Type-checking execution-engine…"
cd "$SERVICE_DIR"
npm run type-check
echo "✅ Type-check passed"

# ── 3. Test ───────────────────────────────────────────────────────────────────
echo "▶ Running tests…"
npm test
echo "✅ Tests passed"

# ── 4. Build ──────────────────────────────────────────────────────────────────
echo "▶ Building execution-engine…"
npm run build
echo "✅ Build complete: $(du -sh dist | cut -f1) in dist/"

# ── 5. Package ────────────────────────────────────────────────────────────────
echo "▶ Packaging dist + package files…"
TMP_TAR="/tmp/execution-engine-$(date +%s).tar.gz"
tar -czf "$TMP_TAR" \
  dist/ \
  package.json \
  package-lock.json
echo "✅ Package: $(du -sh "$TMP_TAR" | cut -f1)"

# ── 6. Upload ─────────────────────────────────────────────────────────────────
echo "▶ Uploading to $SERVER_USER@$SERVER_HOST:$SERVER_PATH …"
scp $SSH_OPTS "$TMP_TAR" "$SERVER_USER@$SERVER_HOST:/tmp/execution-engine-deploy.tar.gz"

# Also ship the systemd unit for easy updates
scp $SSH_OPTS \
  "$REPO_ROOT/scripts/ctrlchecks-execution-engine.service" \
  "$SERVER_USER@$SERVER_HOST:/tmp/ctrlchecks-execution-engine.service"
rm "$TMP_TAR"

# ── 7. Extract, install, restart ─────────────────────────────────────────────
echo "▶ Extracting and restarting service…"
ssh $SSH_OPTS "$SERVER_USER@$SERVER_HOST" bash <<'REMOTE'
  set -euo pipefail
  TARGET=/opt/ctrlchecks-execution-engine

  # Update systemd unit if it differs
  if ! diff -q /tmp/ctrlchecks-execution-engine.service \
       /etc/systemd/system/ctrlchecks-execution-engine.service &>/dev/null; then
    sudo cp /tmp/ctrlchecks-execution-engine.service \
            /etc/systemd/system/ctrlchecks-execution-engine.service
    sudo systemctl daemon-reload
    echo "  systemd unit updated"
  fi
  rm -f /tmp/ctrlchecks-execution-engine.service

  # Extract (preserve .env — not in tar)
  tar -xzf /tmp/execution-engine-deploy.tar.gz -C "$TARGET"
  rm /tmp/execution-engine-deploy.tar.gz

  # Install production deps only
  cd "$TARGET"
  npm ci --omit=dev

  # Restart
  sudo systemctl restart ctrlchecks-execution-engine
  sleep 5

  # Verify
  curl -fsS http://localhost:3003/health/live \
    && echo "✅ /health/live OK" \
    || (echo "❌ /health/live FAILED" && sudo journalctl -u ctrlchecks-execution-engine -n 30 --no-pager && exit 1)

  curl -fsS http://localhost:3003/health/ready \
    && echo "✅ /health/ready OK" \
    || (echo "❌ /health/ready FAILED" && exit 1)

  echo "✅ execution-engine deployed and healthy"
REMOTE

echo ""
echo "✅ Deploy complete — execution-engine is live on :3003 (internal only)"
echo ""
echo "To enable in worker, set on server:"
echo "  EXECUTION_ENGINE_ENABLED=true"
echo "  EXECUTION_ENGINE_URL=http://localhost:3003"
echo "  EXECUTION_ENGINE_SERVICE_KEY=<matching value>"
echo "Then: sudo systemctl restart ctrlchecks-worker"
