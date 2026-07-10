#!/usr/bin/env bash
# deploy-frontend.sh — Build and deploy the CtrlChecks SPA to production.
#
# Usage:
#   ./scripts/deploy-frontend.sh
#
# Prerequisites:
#   - ctrl_checks/.env.production must exist (copy from .env.production.example)
#   - SSH key at Guide/Worker/ctrlchecks-backend.pem
#   - rsync available (falls back to tar+scp if not)
#
# DNS / HTTPS activation (one-time, after DNS A record www.ctrlchecks.ai -> 3.7.115.58):
#   ssh -i Guide/Worker/ctrlchecks-backend.pem ubuntu@3.7.115.58 \
#     "sudo certbot --nginx -d www.ctrlchecks.ai --non-interactive --agree-tos -m YOUR_EMAIL"

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/ctrl_checks"
SERVER_USER="ubuntu"
SERVER_HOST="3.7.115.58"
SERVER_PATH="/var/www/ctrlchecks-frontend"
PEM_KEY="$REPO_ROOT/Guide/Worker/ctrlchecks-backend.pem"
SSH_OPTS="-i $PEM_KEY -o StrictHostKeyChecking=no"

# ── 1. Check prerequisites ────────────────────────────────────────────────────
if [[ ! -f "$PEM_KEY" ]]; then
  echo "❌ PEM key not found: $PEM_KEY" >&2
  exit 1
fi

if [[ ! -f "$FRONTEND_DIR/.env.production" ]]; then
  echo "❌ ctrl_checks/.env.production not found." >&2
  echo "   Copy ctrl_checks/.env.production.example → ctrl_checks/.env.production and fill values." >&2
  exit 1
fi

# ── 2. Build ─────────────────────────────────────────────────────────────────
echo "▶ Building frontend (production mode)…"
cd "$FRONTEND_DIR"
npm run build
echo "✅ Build complete: $(du -sh dist | cut -f1) in dist/"

# ── 3. Deploy ─────────────────────────────────────────────────────────────────
echo "▶ Deploying to $SERVER_USER@$SERVER_HOST:$SERVER_PATH …"

# Ensure remote directory exists
ssh $SSH_OPTS "$SERVER_USER@$SERVER_HOST" "sudo mkdir -p $SERVER_PATH && sudo chown -R ubuntu:ubuntu $SERVER_PATH"

if command -v rsync &>/dev/null; then
  rsync -avz --delete -e "ssh $SSH_OPTS" "$FRONTEND_DIR/dist/" "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/"
else
  echo "  (rsync not found, falling back to tar+scp)"
  TMP_TAR="/tmp/frontend-dist-$(date +%s).tar.gz"
  tar -czf "$TMP_TAR" -C "$FRONTEND_DIR/dist" .
  scp $SSH_OPTS "$TMP_TAR" "$SERVER_USER@$SERVER_HOST:/tmp/frontend-deploy.tar.gz"
  ssh $SSH_OPTS "$SERVER_USER@$SERVER_HOST" "tar -xzf /tmp/frontend-deploy.tar.gz -C $SERVER_PATH && rm /tmp/frontend-deploy.tar.gz"
  rm "$TMP_TAR"
fi

echo "✅ Files deployed."

# ── 4. Smoke test ─────────────────────────────────────────────────────────────
echo "▶ Smoke testing via Host header…"
STATUS=$(ssh $SSH_OPTS "$SERVER_USER@$SERVER_HOST" \
  "curl -s -o /dev/null -w '%{http_code}' -H 'Host: www.ctrlchecks.ai' http://localhost/")

if [[ "$STATUS" == "200" ]]; then
  echo "✅ SPA serving: HTTP 200 from nginx"
else
  echo "⚠  Unexpected status: $STATUS (check nginx logs: sudo journalctl -u nginx -n 20)" >&2
fi

echo ""
echo "────────────────────────────────────────────────────────────────"
echo "Deployment complete."
echo ""
echo "Next step — HTTPS activation (requires DNS A record first):"
echo "  1. Add DNS A record: www.ctrlchecks.ai → 3.7.115.58"
echo "  2. SSH in and run:"
echo "     sudo certbot --nginx -d www.ctrlchecks.ai --non-interactive --agree-tos -m admin@ctrlchecks.ai"
echo "  3. Verify: curl -fsS https://www.ctrlchecks.ai | head -5"
echo "────────────────────────────────────────────────────────────────"
