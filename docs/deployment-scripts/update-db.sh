#!/usr/bin/env bash
set -euo pipefail

INCOMING_DIR="${SPELLBOOK_INCOMING_DATA_DIR:-$HOME/data}"
TARGET_DIR="${SPELLBOOK_TARGET_DIR:-/opt/spellbook/data}"
SERVICE="${SPELLBOOK_SERVICE:-spellbook-api}"
SMOKE_URL="${SPELLBOOK_SMOKE_URL:-http://127.0.0.1:3000/api/rulebooks}"
SMOKE_RETRIES="${SPELLBOOK_SMOKE_RETRIES:-5}"
SMOKE_DELAY_SECONDS="${SPELLBOOK_SMOKE_DELAY_SECONDS:-2}"

RULES_DB_IN="$INCOMING_DIR/spellbook.db"
CONTENT_DB_IN="$INCOMING_DIR/content.sqlite"
LEGACY_CONTENT_DB_IN="$INCOMING_DIR/app.db"
APP_STATE_DB_IN="$INCOMING_DIR/app-state.sqlite"

RULES_DB_TARGET="$TARGET_DIR/spellbook.db"
CONTENT_DB_TARGET="$TARGET_DIR/content.sqlite"
APP_STATE_DB_TARGET="$TARGET_DIR/app-state.sqlite"

declare -a STAGED_PATHS=()
declare -a STAGED_TARGETS=()
declare -a STAGED_LABELS=()
declare -a STAGED_ROLES=()
declare -a BACKUP_PATHS=()
declare -a HAD_TARGETS=()
declare -a SWAPPED_TARGETS=()

RUN_STAMP="$(date -u +%Y%m%dT%H%M%SZ).$$"

echo "==> DB update ($(date -u))"

validate_nonnegative_integer() {
  local name="$1"
  local value="$2"

  case "$value" in
    ''|*[!0-9]*)
      echo "Invalid $name: $value" >&2
      return 1
      ;;
  esac
}

sha256_or_empty() {
  local file="$1"
  if sudo test -f "$file"; then
    sudo sha256sum "$file" | awk '{print $1}'
  else
    echo ""
  fi
}

required_tables_for_role() {
  local role="$1"

  case "$role" in
    rules)
      printf '%s\n' dnd_spell dnd_rulebook dnd_characterclass dnd_domain
      ;;
    content)
      printf '%s\n' SpellContent RulebookContent RulesContentBuild SpellSearchIndexState SpellSearchDocument
      ;;
    app-state)
      printf '%s\n' User FavoriteSpell SpellNote _prisma_migrations
      ;;
    *)
      echo "Unknown SQLite role: $role" >&2
      return 1
      ;;
  esac
}

validate_sqlite_db() {
  local file="$1"
  local role="$2"
  local label="$3"
  local integrity table present

  integrity="$(sudo sqlite3 -readonly "$file" 'PRAGMA integrity_check;')" || {
    echo "$label failed SQLite integrity validation: $file" >&2
    return 1
  }
  if [ "$integrity" != "ok" ]; then
    echo "$label failed SQLite integrity validation: $integrity" >&2
    return 1
  fi

  while IFS= read -r table; do
    present="$(sudo sqlite3 -readonly "$file" "SELECT count(*) FROM sqlite_schema WHERE type IN ('table', 'view') AND name = '$table';")" || return 1
    if [ "$present" != "1" ]; then
      echo "$label is missing required table: $table" >&2
      return 1
    fi
  done < <(required_tables_for_role "$role")
}

cleanup_staged_files() {
  local staged
  for staged in "${STAGED_PATHS[@]}"; do
    sudo rm -f "$staged" "${staged}-wal" "${staged}-shm" 2>/dev/null || true
  done
}

stage_database() {
  local incoming="$1"
  local target="$2"
  local label="$3"
  local role="$4"
  local incoming_hash target_hash staged

  if [ ! -f "$incoming" ]; then
    echo "==> $label: no incoming file at $incoming (skip)"
    return 0
  fi

  if [ -e "${incoming}-wal" ] || [ -e "${incoming}-shm" ]; then
    echo "$label has incoming WAL/SHM sidecars; checkpoint the source DB before upload" >&2
    return 1
  fi

  incoming_hash="$(sha256_or_empty "$incoming")"
  target_hash="$(sha256_or_empty "$target")"
  if [ "$incoming_hash" = "$target_hash" ] && [ -n "$incoming_hash" ]; then
    echo "==> $label: unchanged (skip)"
    return 0
  fi

  staged="${target}.incoming.${RUN_STAMP}.${#STAGED_PATHS[@]}"
  echo "==> $label: stage and validate incoming DB"
  sudo cp -a "$incoming" "$staged"
  sudo chown spellbook:spellbook "$staged"
  sudo chmod 640 "$staged"

  if ! validate_sqlite_db "$staged" "$role" "$label"; then
    sudo rm -f "$staged" 2>/dev/null || true
    return 1
  fi

  STAGED_PATHS+=("$staged")
  STAGED_TARGETS+=("$target")
  STAGED_LABELS+=("$label")
  STAGED_ROLES+=("$role")
  BACKUP_PATHS+=("")
  HAD_TARGETS+=("0")
  SWAPPED_TARGETS+=("0")
}

checkpoint_active_db() {
  local target="$1"
  local role="$2"
  local label="$3"
  local checkpoint busy

  checkpoint="$(sudo sqlite3 "$target" 'PRAGMA wal_checkpoint(TRUNCATE);')" || {
    echo "$label WAL checkpoint failed" >&2
    return 1
  }
  busy="${checkpoint%%|*}"
  if [ "$busy" != "0" ]; then
    echo "$label WAL checkpoint remained busy: $checkpoint" >&2
    return 1
  fi

  validate_sqlite_db "$target" "$role" "$label active DB"
}

activate_staged_databases() {
  local i staged target label role backup

  for ((i = 0; i < ${#STAGED_PATHS[@]}; i++)); do
    staged="${STAGED_PATHS[$i]}"
    target="${STAGED_TARGETS[$i]}"
    label="${STAGED_LABELS[$i]}"
    role="${STAGED_ROLES[$i]}"

    if sudo test -f "$target"; then
      checkpoint_active_db "$target" "$role" "$label" || return 1
      backup="${target}.bak.${RUN_STAMP}"
      echo "    backing up checkpointed $label -> $backup"
      sudo cp -a "$target" "$backup" || return 1
      BACKUP_PATHS[$i]="$backup"
      HAD_TARGETS[$i]="1"
    fi

    sudo rm -f "${target}-wal" "${target}-shm" || return 1
    sudo mv -f "$staged" "$target" || return 1
    SWAPPED_TARGETS[$i]="1"
    echo "    activated -> $target"
  done
}

rollback_databases() {
  local status=0
  local i target label backup

  for ((i = ${#STAGED_PATHS[@]} - 1; i >= 0; i--)); do
    if [ "${SWAPPED_TARGETS[$i]}" != "1" ]; then
      continue
    fi

    target="${STAGED_TARGETS[$i]}"
    label="${STAGED_LABELS[$i]}"
    backup="${BACKUP_PATHS[$i]}"
    echo "    restoring prior $label"
    sudo rm -f "${target}-wal" "${target}-shm" || status=1

    if [ "${HAD_TARGETS[$i]}" = "1" ]; then
      sudo cp -a "$backup" "$target" || status=1
      sudo chown spellbook:spellbook "$target" || status=1
      sudo chmod 640 "$target" || status=1
    else
      sudo rm -f "$target" || status=1
    fi
  done

  return "$status"
}

restart_and_smoke() {
  local success_message="$1"
  local attempt smoke_error=""

  sudo systemctl restart "$SERVICE" || return 1
  sudo systemctl status "$SERVICE" --no-pager || return 1

  for ((attempt = 1; attempt <= SMOKE_RETRIES; attempt++)); do
    if smoke_error="$(curl -fsS "$SMOKE_URL" 2>&1 >/dev/null)"; then
      echo "$success_message"
      return 0
    fi

    echo "    smoke attempt $attempt failed; retrying..."
    if [ "$attempt" -lt "$SMOKE_RETRIES" ]; then
      sleep "$SMOKE_DELAY_SECONDS"
    fi
  done

  echo "Smoke test failed after $SMOKE_RETRIES attempt(s)" >&2
  if [ -n "$smoke_error" ]; then
    echo "$smoke_error" >&2
  fi
  return 1
}

restore_after_failure() {
  echo "==> Activation failed; restore prior DBs" >&2
  if ! sudo systemctl stop "$SERVICE"; then
    echo "Could not stop $SERVICE safely for DB rollback" >&2
    return 1
  fi
  if ! rollback_databases; then
    echo "DB rollback was incomplete; leaving $SERVICE stopped" >&2
    return 1
  fi
  restart_and_smoke "==> Prior DBs restored and backend is healthy"
}

validate_nonnegative_integer "SPELLBOOK_SMOKE_RETRIES" "$SMOKE_RETRIES"
validate_nonnegative_integer "SPELLBOOK_SMOKE_DELAY_SECONDS" "$SMOKE_DELAY_SECONDS"
if [ "$SMOKE_RETRIES" = "0" ]; then
  echo "SPELLBOOK_SMOKE_RETRIES must be greater than zero" >&2
  exit 1
fi

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "sqlite3 is required for deployment integrity and schema validation" >&2
  exit 1
fi

sudo mkdir -p "$TARGET_DIR"
sudo chown -R spellbook:spellbook "$TARGET_DIR"
sudo chmod 750 "$TARGET_DIR"
trap cleanup_staged_files EXIT

stage_database "$RULES_DB_IN" "$RULES_DB_TARGET" "RULES DB" "rules"

content_in="$CONTENT_DB_IN"
if [ ! -f "$content_in" ] && [ -f "$LEGACY_CONTENT_DB_IN" ]; then
  echo "==> CONTENT DB: using legacy incoming file $LEGACY_CONTENT_DB_IN"
  content_in="$LEGACY_CONTENT_DB_IN"
fi
stage_database "$content_in" "$CONTENT_DB_TARGET" "CONTENT DB" "content"
stage_database "$APP_STATE_DB_IN" "$APP_STATE_DB_TARGET" "APP-STATE DB" "app-state"

if [ "${#STAGED_PATHS[@]}" = "0" ]; then
  echo "==> No changed DBs to activate"
  exit 0
fi

echo "==> Stop backend before checkpoint, backup, and swap"
if ! sudo systemctl stop "$SERVICE"; then
  echo "Could not stop $SERVICE; no staged DB was activated" >&2
  exit 1
fi

if ! activate_staged_databases; then
  if ! restore_after_failure; then
    echo "Automatic DB rollback did not complete cleanly" >&2
  fi
  exit 1
fi

echo "==> Restart backend and smoke-test activated DBs"
if ! restart_and_smoke "✅ DB update complete"; then
  if ! restore_after_failure; then
    echo "Automatic DB rollback did not complete cleanly" >&2
  fi
  exit 1
fi
