#!/usr/bin/env bash
set -euo pipefail

REPO="$HOME/dnd3.5-spellbook"
TARGET="/opt/spellbook"
DATA_DIR="$TARGET/data"
INCOMING_DATA_DIR="$HOME/data"

SERVICE="spellbook-api"
WORKSPACE="server"

RULES_DB_NAME="spellbook.db"
CONTENT_DB_NAME="content.sqlite"
LEGACY_CONTENT_DB_NAME="app.db"
APP_STATE_DB_NAME="app-state.sqlite"

echo "==> Deploy backend ($(date -u))"

ensure_data_dir() {
  sudo mkdir -p "$DATA_DIR"
  sudo chown -R spellbook:spellbook "$DATA_DIR"
  sudo chmod 750 "$DATA_DIR"
}

sha256_or_empty() {
  local f="$1"
  if sudo test -f "$f"; then
    sudo sha256sum "$f" | awk '{print $1}'
  else
    echo ""
  fi
}

maybe_replace_db() {
  local incoming="$1"      # e.g. ~/data/spellbook.db
  local target="$2"        # e.g. /opt/spellbook/data/spellbook.db
  local label="$3"         # e.g. rules/app

  if [ ! -f "$incoming" ]; then
    echo "==> DB ($label): no incoming file at $incoming (skip)"
    return 0
  fi

  local in_hash tgt_hash
  in_hash="$(sha256_or_empty "$incoming")"
  tgt_hash="$(sha256_or_empty "$target")"

  if [ "$in_hash" = "$tgt_hash" ] && [ -n "$in_hash" ]; then
    echo "==> DB ($label): unchanged (skip)"
    return 0
  fi

  echo "==> DB ($label): updating"
  # Backup existing DB if present
  if sudo test -f "$target"; then
    local backup="${target}.bak.$(date -u +%Y%m%dT%H%M%SZ)"
    echo "    backing up existing -> $backup"
    sudo cp -a "$target" "$backup"
  fi

  # Replace atomically-ish: copy to temp then move into place
  local tmp="${target}.tmp.$(date -u +%s)"
  sudo cp -a "$incoming" "$tmp"
  sudo chown spellbook:spellbook "$tmp"
  sudo chmod 640 "$tmp"
  sudo mv -f "$tmp" "$target"

  # Clean up any WAL/SHM from previous runs (optional but helps avoid mismatches)
  sudo rm -f "${target}-wal" "${target}-shm" 2>/dev/null || true

  echo "    updated -> $target"
}

# --- 0) Ensure data dir exists early ---
ensure_data_dir

# --- 1) Optionally update DBs from ~/data ---
maybe_replace_db "$INCOMING_DATA_DIR/$RULES_DB_NAME" "$DATA_DIR/$RULES_DB_NAME" "rules"

CONTENT_DB_IN="$INCOMING_DATA_DIR/$CONTENT_DB_NAME"
if [ ! -f "$CONTENT_DB_IN" ] && [ -f "$INCOMING_DATA_DIR/$LEGACY_CONTENT_DB_NAME" ]; then
  echo "==> DB (content): using legacy incoming file $INCOMING_DATA_DIR/$LEGACY_CONTENT_DB_NAME"
  CONTENT_DB_IN="$INCOMING_DATA_DIR/$LEGACY_CONTENT_DB_NAME"
fi
maybe_replace_db "$CONTENT_DB_IN" "$DATA_DIR/$CONTENT_DB_NAME" "content"
maybe_replace_db "$INCOMING_DATA_DIR/$APP_STATE_DB_NAME" "$DATA_DIR/$APP_STATE_DB_NAME" "app-state"

# --- 2) Update repo ---
echo "==> Update repo"
cd "$REPO"
git reset --hard
git clean -fd
git pull --ff-only

# --- 3) Install deps ---
echo "==> Install deps"
export NODE_OPTIONS="--max-old-space-size=256"
npm ci

# --- 4) Generate + build ---
echo "==> Prisma generate"
npm run -w "$WORKSPACE" db:generate

echo "==> Build"
npm run build:contracts
npm run check:contracts
npm run -w "$WORKSPACE" build

# --- 5) Sync code to /opt/spellbook (preserve data/) ---
echo "==> Sync to $TARGET (preserve data/)"
sudo mkdir -p "$TARGET"
sudo rsync -a --delete \
  --exclude 'data/' \
  "$REPO"/ \
  "$TARGET"/

echo "==> Ensure ownership"
sudo chown -R spellbook:spellbook "$TARGET"
# Re-assert data dir perms in case anything changed
ensure_data_dir

# --- 6) Restart service ---
echo "==> Restart service: $SERVICE"
sudo systemctl restart "$SERVICE"
sudo systemctl status "$SERVICE" --no-pager

# --- 7) Smoke test ---
echo "==> Smoke test"
smoke_error=""
for attempt in 1 2 3 4 5; do
  if smoke_error="$(curl -fsS "http://127.0.0.1:3000/api/rulebooks" 2>&1 >/dev/null)"; then
    echo "✅ Backend deploy OK"
    exit 0
  fi

  echo "    smoke attempt $attempt failed; retrying..."
  sleep 2
done

echo "Backend smoke test failed after retries" >&2
if [ -n "$smoke_error" ]; then
  echo "$smoke_error" >&2
fi
exit 1
