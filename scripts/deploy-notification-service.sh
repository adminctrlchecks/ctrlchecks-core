#!/usr/bin/env bash
# deploy-notification-service.sh — Build and deploy the Notification Service to production.
#
# Usage:
#   ./scripts/deploy-notification-service.sh
#
# First-deploy server setup (one-time, SSH in and run):
#   sudo mkdir -p /opt/ctrlchecks-notification-service
#   sudo chown -R ubuntu:ubuntu /opt/ctrlchecks-notification-service
#   sudo cp /opt/ctrlchecks-worker/scripts/ctrlchecks-notification-service.service \
#           /etc/systemd/system/ctrlchecks-notification-service.service
#   sudo systemctl daemon-reload
#   sudo systemctl enable ctrlchecks-notification-service
#   # Create /opt/ctrlchecks-notification-service/.env (copy from .env.example, fill values)
#
# Prerequisites:
#   - services/notification-service/ with built code
#   - SSH key at Guide/Worker/ctrlchecks-backend.pem
#   - Server: ubuntu@3.7.115.58, service at /opt/ctrlchecks-notification-service/

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_DIR="$REPO_ROOT/services/notification-service"
SERVER_USER="root"
SERVER_HOST="187.127.185.105"
SERVER_PATH="/opt/ctrlchecks-notification-service"
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
echo "▶ Type-checking notification-service…"
cd "$SERVICE_DIR"
npm run type-check
echo "✅ Type-check passed"

# ── 3. Test ───────────────────────────────────────────────────────────────────
echo "▶ Running tests…"
npm test
echo "✅ Tests passed"

# ── 4. Build ──────────────────────────────────────────────────────────────────
echo "▶ Building notification-service…"
npm run build
echo "✅ Build complete: $(du -sh dist | cut -f1) in dist/"

# ── 5. Package ────────────────────────────────────────────────────────────────
echo "▶ Packaging dist + package files…"
TMP_TAR="/tmp/notification-service-$(date +%s).tar.gz"
cd "$REPO_ROOT"
tar -czf "$TMP_TAR" \
  -C services/notification-service \
  dist/ package.json package-lock.json
echo "✅ Tarball: $TMP_TAR ($(du -sh "$TMP_TAR" | cut -f1))"

# ── 6. Upload ─────────────────────────────────────────────────────────────────
echo "▶ Uploading to $SERVER_HOST…"
scp $SSH_OPTS "$TMP_TAR" "$SERVER_USER@$SERVER_HOST:/tmp/notification-service-deploy.tar.gz"
scp $SSH_OPTS \
  "$REPO_ROOT/scripts/ctrlchecks-notification-service.service" \
  "$SERVER_USER@$SERVER_HOST:/tmp/ctrlchecks-notification-service.service"
rm -f "$TMP_TAR"
echo "✅ Upload complete"

# ── 7. Remote deploy ──────────────────────────────────────────────────────────
echo "▶ Deploying on $SERVER_HOST…"
ssh $SSH_OPTS "$SERVER_USER@$SERVER_HOST" bash << REMOTE
  set -euo pipefail
  TARGET=$SERVER_PATH

  # Update systemd unit if changed
  if ! diff -q /tmp/ctrlchecks-notification-service.service \
       /etc/systemd/system/ctrlchecks-notification-service.service &>/dev/null 2>&1; then
    sudo cp /tmp/ctrlchecks-notification-service.service \
            /etc/systemd/system/ctrlchecks-notification-service.service
    sudo systemctl daemon-reload
    echo "systemd unit updated"
  fi
  rm -f /tmp/ctrlchecks-notification-service.service

  tar -xzf /tmp/notification-service-deploy.tar.gz -C "\$TARGET"
  rm /tmp/notification-service-deploy.tar.gz

  cd "\$TARGET"
  npm ci --omit=dev
  sudo systemctl restart ctrlchecks-notification-service
  sleep 5

  curl -fsS http://localhost:3005/health/live \
    && echo "health/live OK" \
    || (sudo journalctl -u ctrlchecks-notification-service -n 30 --no-pager && exit 1)
  curl -fsS http://localhost:3005/health/ready \
    && echo "health/ready OK" \
    || exit 1
REMOTE

echo ""
echo "✅ Deploy complete — notification-service running on $SERVER_HOST:3005"
echo "   Logs: ssh -i Guide/Worker/ctrlchecks-backend.pem ubuntu@$SERVER_HOST \\"
echo "         'sudo journalctl -u ctrlchecks-notification-service -f'"
