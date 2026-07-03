#!/usr/bin/env bash
set -euo pipefail

INCOMING_DIR="$HOME/data"
TARGET_DIR="/opt/spellbook/data"
SERVICE="spellbook-api"

RULES_DB_IN="$INCOMING_DIR/spellbook.db"
CONTENT_DB_IN="$INCOMING_DIR/content.sqlite"
LEGACY_CONTENT_DB_IN="$INCOMING_DIR/app.db"
APP_STATE_DB_IN="$INCOMING_DIR/app-state.sqlite"

RULES_DB_TARGET="$TARGET_DIR/spellbook.db"
CONTENT_DB_TARGET="$TARGET_DIR/content.sqlite"
APP_STATE_DB_TARGET="$TARGET_DIR/app-state.sqlite"

echo "==> DB update ($(date -u))"

# Ensure target dir exists
sudo mkdir -p "$TARGET_DIR"
sudo chown -R spellbook:spellbook "$TARGET_DIR"
sudo chmod 750 "$TARGET_DIR"

sha256_or_empty() {
  local f="$1"
  if sudo test -f "$f"; then
    sudo sha256sum "$f" | awk '{print $1}'
  else
    echo ""
  fi
}

update_one() {
  local incoming="$1"
  local target="$2"
  local label="$3"

  if [ ! -f "$incoming" ]; then
    echo "==> $label: no incoming file at $incoming (skip)"
    return 0
  fi

  local in_hash tgt_hash
  in_hash="$(sha256_or_empty "$incoming")"
  tgt_hash="$(sha256_or_empty "$target")"

  if [ "$in_hash" = "$tgt_hash" ] && [ -n "$in_hash" ]; then
    echo "==> $label: unchanged (skip)"
    return 0
  fi

  echo "==> $label: updating"

  if sudo test -f "$target"; then
    backup="${target}.bak.$(date -u +%Y%m%dT%H%M%SZ)"
    echo "    backing up existing -> $backup"
    sudo cp -a "$target" "$backup"
  fi

  tmp="${target}.tmp.$(date -u +%s)"
  sudo cp -a "$incoming" "$tmp"
  sudo chown spellbook:spellbook "$tmp"
  sudo chmod 640 "$tmp"
  sudo mv -f "$tmp" "$target"

  # Clean old WAL/SHM files if any
  sudo rm -f "${target}-wal" "${target}-shm" 2>/dev/null || true

  echo "    updated -> $target"
}

update_one "$RULES_DB_IN" "$RULES_DB_TARGET" "RULES DB"

content_in="$CONTENT_DB_IN"
if [ ! -f "$content_in" ] && [ -f "$LEGACY_CONTENT_DB_IN" ]; then
  echo "==> CONTENT DB: using legacy incoming file $LEGACY_CONTENT_DB_IN"
  content_in="$LEGACY_CONTENT_DB_IN"
fi
update_one "$content_in" "$CONTENT_DB_TARGET" "CONTENT DB"
update_one "$APP_STATE_DB_IN" "$APP_STATE_DB_TARGET" "APP-STATE DB"

echo "==> Restarting backend"
sudo systemctl restart "$SERVICE"
sudo systemctl status "$SERVICE" --no-pager

echo "==> Smoke test"
smoke_error=""
for attempt in 1 2 3 4 5; do
  if smoke_error="$(curl -fsS "http://127.0.0.1:3000/api/rulebooks" 2>&1 >/dev/null)"; then
    echo "✅ DB update complete"
    exit 0
  fi

  echo "    smoke attempt $attempt failed; retrying..."
  sleep 2
done

echo "DB update smoke test failed after retries" >&2
if [ -n "$smoke_error" ]; then
  echo "$smoke_error" >&2
fi
exit 1
