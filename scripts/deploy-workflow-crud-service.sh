#!/usr/bin/env bash
# deploy-workflow-crud-service.sh — Build and deploy the Workflow CRUD Service to production.
#
# Usage:
#   ./scripts/deploy-workflow-crud-service.sh
#
# First-deploy server setup (one-time, SSH in and run):
#   sudo mkdir -p /opt/ctrlchecks-workflow-crud-service
#   sudo chown -R ubuntu:ubuntu /opt/ctrlchecks-workflow-crud-service
#   sudo cp /opt/ctrlchecks-worker/scripts/ctrlchecks-workflow-crud-service.service \
#           /etc/systemd/system/ctrlchecks-workflow-crud-service.service
#   sudo systemctl daemon-reload
#   sudo systemctl enable ctrlchecks-workflow-crud-service
#   # Create /opt/ctrlchecks-workflow-crud-service/.env (copy from .env.example, fill values)
#
# Prerequisites:
#   - services/workflow-crud-service/ with built code
#   - SSH key at Guide/Worker/ctrlchecks-backend.pem
#   - Server: ubuntu@3.7.115.58, service at /opt/ctrlchecks-workflow-crud-service/

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_DIR="$REPO_ROOT/services/workflow-crud-service"
SERVER_USER="root"
SERVER_HOST="187.127.185.105"
SERVER_PATH="/opt/ctrlchecks-workflow-crud-service"
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
echo "▶ Type-checking workflow-crud-service…"
cd "$SERVICE_DIR"
npm run type-check
echo "✅ Type-check passed"

# ── 3. Test ───────────────────────────────────────────────────────────────────
echo "▶ Running tests…"
npm test
echo "✅ Tests passed"

# ── 4. Build ──────────────────────────────────────────────────────────────────
echo "▶ Building workflow-crud-service…"
npm run build
echo "✅ Build complete: $(du -sh dist | cut -f1) in dist/"

# ── 5. Package ────────────────────────────────────────────────────────────────
echo "▶ Packaging dist + package files…"
TMP_TAR="/tmp/workflow-crud-service-$(date +%s).tar.gz"
cd "$REPO_ROOT"
tar -czf "$TMP_TAR" \
  -C services/workflow-crud-service \
  dist/ package.json package-lock.json
echo "✅ Tarball: $TMP_TAR ($(du -sh "$TMP_TAR" | cut -f1))"

# ── 6. Upload ─────────────────────────────────────────────────────────────────
echo "▶ Uploading to $SERVER_HOST…"
scp $SSH_OPTS "$TMP_TAR" "$SERVER_USER@$SERVER_HOST:/tmp/workflow-crud-service-deploy.tar.gz"
scp $SSH_OPTS \
  "$REPO_ROOT/scripts/ctrlchecks-workflow-crud-service.service" \
  "$SERVER_USER@$SERVER_HOST:/tmp/ctrlchecks-workflow-crud-service.service"
rm -f "$TMP_TAR"
echo "✅ Upload complete"

# ── 7. Remote deploy ──────────────────────────────────────────────────────────
echo "▶ Deploying on $SERVER_HOST…"
ssh $SSH_OPTS "$SERVER_USER@$SERVER_HOST" bash << REMOTE
  set -euo pipefail
  TARGET=$SERVER_PATH

  # Update systemd unit if changed
  if ! diff -q /tmp/ctrlchecks-workflow-crud-service.service \
       /etc/systemd/system/ctrlchecks-workflow-crud-service.service &>/dev/null 2>&1; then
    sudo cp /tmp/ctrlchecks-workflow-crud-service.service \
            /etc/systemd/system/ctrlchecks-workflow-crud-service.service
    sudo systemctl daemon-reload
    echo "systemd unit updated"
  fi
  rm -f /tmp/ctrlchecks-workflow-crud-service.service

  tar -xzf /tmp/workflow-crud-service-deploy.tar.gz -C "\$TARGET"
  rm /tmp/workflow-crud-service-deploy.tar.gz

  cd "\$TARGET"
  npm ci --omit=dev
  sudo systemctl restart ctrlchecks-workflow-crud-service
  sleep 5

  curl -fsS http://localhost:3007/health/live \
    && echo "health/live OK" \
    || (sudo journalctl -u ctrlchecks-workflow-crud-service -n 30 --no-pager && exit 1)
  curl -fsS http://localhost:3007/health/ready \
    && echo "health/ready OK" \
    || exit 1
REMOTE

echo ""
echo "✅ Deploy complete — workflow-crud-service running on $SERVER_HOST:3007"
echo "   Logs: ssh -i Guide/Worker/ctrlchecks-backend.pem ubuntu@$SERVER_HOST \\"
echo "         'sudo journalctl -u ctrlchecks-workflow-crud-service -f'"
