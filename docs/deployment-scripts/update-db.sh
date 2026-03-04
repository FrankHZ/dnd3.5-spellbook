#!/usr/bin/env bash
set -euo pipefail

INCOMING_DIR="$HOME/data"
TARGET_DIR="/opt/spellbook/data"
SERVICE="spellbook-api"

RULES_DB_IN="$INCOMING_DIR/spellbook.db"
APP_DB_IN="$INCOMING_DIR/app.db"

RULES_DB_TARGET="$TARGET_DIR/spellbook.db"
APP_DB_TARGET="$TARGET_DIR/app.db"

echo "==> DB update ($(date -u))"

# Ensure target dir exists
sudo mkdir -p "$TARGET_DIR"
sudo chown -R spellbook:spellbook "$TARGET_DIR"
sudo chmod 750 "$TARGET_DIR"

sha256_or_empty() {
  local f="$1"
  if [ -f "$f" ]; then
    sha256sum "$f" | awk '{print $1}'
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

  if [ -f "$target" ]; then
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
update_one "$APP_DB_IN"   "$APP_DB_TARGET"   "APP DB"

echo "==> Restarting backend"
sudo systemctl restart "$SERVICE"
sudo systemctl status "$SERVICE" --no-pager

echo "==> Smoke test"
curl -fsS "http://127.0.0.1:3000/api/rulebooks" >/dev/null

echo "✅ DB update complete"
