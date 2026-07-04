#!/usr/bin/env bash
set -euo pipefail

REPO="$HOME/dnd3.5-spellbook"
TARGET="/opt/spellbook"
DATA_DIR="$TARGET/data"
INCOMING_DATA_DIR="$HOME/data"

SERVICE="spellbook-api"
WORKSPACE="server"
ENV_FILE="/etc/default/spellbook-api"

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

env_quote() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//\$/\\\$}"
  value="${value//\`/\\\`}"
  printf '"%s"' "$value"
}

upsert_env_var() {
  local key="$1"
  local value="$2"
  local line tmp out
  line="$key=$(env_quote "$value")"
  tmp="$(mktemp)"
  out="$(mktemp)"

  if sudo test -f "$ENV_FILE"; then
    sudo cat "$ENV_FILE" > "$tmp"
  fi

  awk -v key="$key" -v line="$line" '
    index($0, key "=") == 1 { print line; done = 1; next }
    { print }
    END { if (!done) print line }
  ' "$tmp" > "$out"

  sudo install -m 640 -o root -g root "$out" "$ENV_FILE"
  rm -f "$tmp" "$out"
}

write_backend_metadata() {
  local commit short ref deployed_at version_label run_id run_attempt

  commit="${SPELLBOOK_BACKEND_COMMIT_SHA:-}"
  if [ -z "$commit" ]; then
    commit="$(git rev-parse HEAD 2>/dev/null || true)"
  fi

  short="${SPELLBOOK_BACKEND_SHORT_SHA:-}"
  if [ -z "$short" ] && [ -n "$commit" ]; then
    short="${commit:0:7}"
  fi

  ref="${SPELLBOOK_BACKEND_REF:-}"
  if [ -z "$ref" ]; then
    ref="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
  fi

  deployed_at="${SPELLBOOK_BACKEND_DEPLOYED_AT:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
  version_label="${SPELLBOOK_VERSION_LABEL:-local}"
  run_id="${SPELLBOOK_BACKEND_GITHUB_RUN_ID:-}"
  run_attempt="${SPELLBOOK_BACKEND_GITHUB_RUN_ATTEMPT:-}"

  echo "==> Update backend version metadata in $ENV_FILE"
  upsert_env_var "SPELLBOOK_VERSION_LABEL" "$version_label"
  upsert_env_var "SPELLBOOK_BACKEND_COMMIT_SHA" "$commit"
  upsert_env_var "SPELLBOOK_BACKEND_SHORT_SHA" "$short"
  upsert_env_var "SPELLBOOK_BACKEND_REF" "$ref"
  upsert_env_var "SPELLBOOK_BACKEND_DEPLOYED_AT" "$deployed_at"
  upsert_env_var "SPELLBOOK_BACKEND_GITHUB_RUN_ID" "$run_id"
  upsert_env_var "SPELLBOOK_BACKEND_GITHUB_RUN_ATTEMPT" "$run_attempt"
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
NODE_MAX_OLD_SPACE_SIZE="${SPELLBOOK_NODE_MAX_OLD_SPACE_SIZE:-384}"
case "$NODE_MAX_OLD_SPACE_SIZE" in
  ''|*[!0-9]*)
    echo "Invalid SPELLBOOK_NODE_MAX_OLD_SPACE_SIZE: $NODE_MAX_OLD_SPACE_SIZE" >&2
    exit 1
    ;;
esac
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=$NODE_MAX_OLD_SPACE_SIZE"
echo "==> Node max-old-space-size: ${NODE_MAX_OLD_SPACE_SIZE}MB"
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
write_backend_metadata

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
