#!/usr/bin/env bash
set -euo pipefail

REPO="${SPELLBOOK_REPO_DIR:-$HOME/dnd3.5-spellbook}"
TARGET="${SPELLBOOK_TARGET_DIR:-/opt/spellbook}"
DATA_DIR="$TARGET/data"
INCOMING_DATA_DIR="${SPELLBOOK_INCOMING_DATA_DIR:-$HOME/data}"

SERVICE="${SPELLBOOK_SERVICE:-spellbook-api}"
WORKSPACE="server"
ENV_FILE="${SPELLBOOK_ENV_FILE:-/etc/default/spellbook-api}"
GIT_REMOTE="${SPELLBOOK_DEPLOY_GIT_REMOTE:-origin}"
LOGICAL_REF="${SPELLBOOK_DEPLOY_LOGICAL_REF:-main}"
SMOKE_URL="${SPELLBOOK_SMOKE_URL:-http://127.0.0.1:3000/api/rulebooks}"
SMOKE_RETRIES="${SPELLBOOK_SMOKE_RETRIES:-5}"
SMOKE_DELAY_SECONDS="${SPELLBOOK_SMOKE_DELAY_SECONDS:-2}"

RULES_DB_NAME="spellbook.db"
CONTENT_DB_NAME="content.sqlite"
LEGACY_CONTENT_DB_NAME="app.db"
APP_STATE_DB_NAME="app-state.sqlite"

EXPECTED_COMMIT="${1:-${SPELLBOOK_DEPLOY_EXPECTED_SHA:-}}"
GITHUB_RUN_ID="${2:-${SPELLBOOK_BACKEND_GITHUB_RUN_ID:-}}"
GITHUB_RUN_ATTEMPT="${3:-${SPELLBOOK_BACKEND_GITHUB_RUN_ATTEMPT:-}}"
VERIFIED_COMMIT=""
VERIFIED_SHORT=""
VERIFIED_REF=""
declare -a VERIFIED_REFS=()

declare -a STAGED_PATHS=()
declare -a STAGED_TARGETS=()
declare -a STAGED_LABELS=()
declare -a STAGED_ROLES=()
declare -a BACKUP_PATHS=()
declare -a HAD_TARGETS=()
declare -a SWAPPED_TARGETS=()

RUN_STAMP="$(date -u +%Y%m%dT%H%M%SZ).$$"

echo "==> Deploy backend ($(date -u))"

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

validate_optional_nonnegative_integer() {
  local name="$1"
  local value="$2"

  if [ -n "$value" ]; then
    validate_nonnegative_integer "$name" "$value"
  fi
}

normalize_remote_ref() {
  local ref="$1"

  case "$ref" in
    */HEAD)
      return 1
      ;;
    "$GIT_REMOTE"/*)
      printf '%s\n' "${ref#"$GIT_REMOTE/"}"
      ;;
    *)
      printf '%s\n' "$ref"
      ;;
  esac
}

select_verified_ref() {
  local ref normalized

  if [ -n "$LOGICAL_REF" ]; then
    for ref in "${VERIFIED_REFS[@]}"; do
      if [ "$ref" = "$GIT_REMOTE/$LOGICAL_REF" ]; then
        printf '%s\n' "$LOGICAL_REF"
        return 0
      fi
    done
  fi

  for ref in "${VERIFIED_REFS[@]}"; do
    if normalized="$(normalize_remote_ref "$ref")"; then
      printf '%s\n' "$normalized"
      return 0
    fi
  done

  printf '%s\n' "detached"
}

ensure_data_dir() {
  sudo mkdir -p "$DATA_DIR" || return 1
  sudo chown -R spellbook:spellbook "$DATA_DIR" || return 1
  sudo chmod 750 "$DATA_DIR" || return 1
}

sha256_or_empty() {
  local file="$1"
  if sudo test -f "$file"; then
    sudo sha256sum "$file" | awk '{print $1}'
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
    sudo cat "$ENV_FILE" > "$tmp" || return 1
  fi

  awk -v key="$key" -v line="$line" '
    index($0, key "=") == 1 { print line; done = 1; next }
    { print }
    END { if (!done) print line }
  ' "$tmp" > "$out" || return 1

  sudo install -m 640 -o root -g root "$out" "$ENV_FILE" || return 1
  rm -f "$tmp" "$out"
}

write_backend_metadata() {
  local deployed_at version_label

  deployed_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  version_label="$(node "$REPO/scripts/release-metadata.mjs" --label)" || return 1

  echo "==> Update backend version metadata in $ENV_FILE"
  upsert_env_var "SPELLBOOK_VERSION_LABEL" "$version_label" || return 1
  upsert_env_var "SPELLBOOK_BACKEND_COMMIT_SHA" "$VERIFIED_COMMIT" || return 1
  upsert_env_var "SPELLBOOK_BACKEND_SHORT_SHA" "$VERIFIED_SHORT" || return 1
  upsert_env_var "SPELLBOOK_BACKEND_REF" "$VERIFIED_REF" || return 1
  upsert_env_var "SPELLBOOK_BACKEND_DEPLOYED_AT" "$deployed_at" || return 1
  upsert_env_var "SPELLBOOK_BACKEND_GITHUB_RUN_ID" "$GITHUB_RUN_ID" || return 1
  upsert_env_var "SPELLBOOK_BACKEND_GITHUB_RUN_ATTEMPT" "$GITHUB_RUN_ATTEMPT"
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
    echo "==> DB ($label): no incoming file at $incoming (skip)"
    return 0
  fi

  if [ -e "${incoming}-wal" ] || [ -e "${incoming}-shm" ]; then
    echo "DB ($label) has incoming WAL/SHM sidecars; checkpoint the source DB before upload" >&2
    return 1
  fi

  incoming_hash="$(sha256_or_empty "$incoming")"
  target_hash="$(sha256_or_empty "$target")"
  if [ "$incoming_hash" = "$target_hash" ] && [ -n "$incoming_hash" ]; then
    echo "==> DB ($label): unchanged (skip)"
    return 0
  fi

  staged="${target}.incoming.${RUN_STAMP}.${#STAGED_PATHS[@]}"
  echo "==> DB ($label): stage and validate incoming DB"
  sudo cp -a "$incoming" "$staged"
  sudo chown spellbook:spellbook "$staged"
  sudo chmod 640 "$staged"

  if ! validate_sqlite_db "$staged" "$role" "DB ($label)"; then
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
    echo "DB ($label) WAL checkpoint failed" >&2
    return 1
  }
  busy="${checkpoint%%|*}"
  if [ "$busy" != "0" ]; then
    echo "DB ($label) WAL checkpoint remained busy: $checkpoint" >&2
    return 1
  fi

  validate_sqlite_db "$target" "$role" "DB ($label) active DB"
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
      echo "    backing up checkpointed DB ($label) -> $backup"
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
    echo "    restoring prior DB ($label)"
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
  echo "==> Runtime activation failed; restore prior DBs" >&2
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

run_runtime_deploy() {
  echo "==> Stop backend before code sync, DB backup, and DB swap"
  sudo systemctl stop "$SERVICE" || return 1

  echo "==> Sync verified code to $TARGET (preserve data/)"
  sudo mkdir -p "$TARGET" || return 1
  sudo rsync -a --delete \
    --exclude 'data/' \
    "$REPO"/ \
    "$TARGET"/ || return 1

  echo "==> Ensure ownership"
  sudo chown -R spellbook:spellbook "$TARGET" || return 1
  ensure_data_dir || return 1
  activate_staged_databases || return 1
  write_backend_metadata || return 1

  echo "==> Restart service and smoke-test verified commit"
  restart_and_smoke "✅ Backend deploy OK"
}

if [[ ! "$EXPECTED_COMMIT" =~ ^[0-9a-fA-F]{40}$ ]]; then
  echo "deploy-backend.sh requires an explicit 40-character expected commit SHA" >&2
  exit 1
fi
EXPECTED_COMMIT="${EXPECTED_COMMIT,,}"

validate_optional_nonnegative_integer "GitHub run id" "$GITHUB_RUN_ID"
validate_optional_nonnegative_integer "GitHub run attempt" "$GITHUB_RUN_ATTEMPT"
validate_nonnegative_integer "SPELLBOOK_SMOKE_RETRIES" "$SMOKE_RETRIES"
validate_nonnegative_integer "SPELLBOOK_SMOKE_DELAY_SECONDS" "$SMOKE_DELAY_SECONDS"
if [ "$SMOKE_RETRIES" = "0" ]; then
  echo "SPELLBOOK_SMOKE_RETRIES must be greater than zero" >&2
  exit 1
fi

if ! command -v sqlite3 >/dev/null 2>&1 || ! sqlite3 --version >/dev/null 2>&1; then
  echo "sqlite3 is required for deployment integrity and schema validation" >&2
  exit 1
fi

echo "==> Fetch and pin remote checkout to $EXPECTED_COMMIT"
cd "$REPO"
git fetch --prune "$GIT_REMOTE"
resolved_expected="$(git rev-parse "${EXPECTED_COMMIT}^{commit}")"
resolved_expected="${resolved_expected,,}"
if [ "$resolved_expected" != "$EXPECTED_COMMIT" ]; then
  echo "Expected commit resolved to a different object: $resolved_expected" >&2
  exit 1
fi

git reset --hard "$EXPECTED_COMMIT"
git clean -fd
VERIFIED_COMMIT="$(git rev-parse HEAD)"
VERIFIED_COMMIT="${VERIFIED_COMMIT,,}"
if [ "$VERIFIED_COMMIT" != "$EXPECTED_COMMIT" ]; then
  echo "Remote HEAD mismatch: expected $EXPECTED_COMMIT, got $VERIFIED_COMMIT" >&2
  exit 1
fi
VERIFIED_SHORT="$(git rev-parse --short=7 HEAD)"
mapfile -t VERIFIED_REFS < <(
  git branch -r --contains "$VERIFIED_COMMIT" --sort=refname --format='%(refname:short)'
)
VERIFIED_REF="$(select_verified_ref)"
echo "==> Verified deploy commit: $VERIFIED_COMMIT ($VERIFIED_REF)"

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

echo "==> Prisma generate"
npm run -w "$WORKSPACE" db:generate

echo "==> Build"
npm run build:contracts
npm run check:contracts
npm run -w "$WORKSPACE" build

ensure_data_dir
trap cleanup_staged_files EXIT

stage_database "$INCOMING_DATA_DIR/$RULES_DB_NAME" "$DATA_DIR/$RULES_DB_NAME" "rules" "rules"

CONTENT_DB_IN="$INCOMING_DATA_DIR/$CONTENT_DB_NAME"
if [ ! -f "$CONTENT_DB_IN" ] && [ -f "$INCOMING_DATA_DIR/$LEGACY_CONTENT_DB_NAME" ]; then
  echo "==> DB (content): using legacy incoming file $INCOMING_DATA_DIR/$LEGACY_CONTENT_DB_NAME"
  CONTENT_DB_IN="$INCOMING_DATA_DIR/$LEGACY_CONTENT_DB_NAME"
fi
stage_database "$CONTENT_DB_IN" "$DATA_DIR/$CONTENT_DB_NAME" "content" "content"
stage_database "$INCOMING_DATA_DIR/$APP_STATE_DB_NAME" "$DATA_DIR/$APP_STATE_DB_NAME" "app-state" "app-state"

if ! run_runtime_deploy; then
  if ! restore_after_failure; then
    echo "Automatic DB rollback did not complete cleanly" >&2
  fi
  exit 1
fi
