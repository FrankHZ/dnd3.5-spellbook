import assert from "node:assert/strict";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));

function toBashPath(path) {
  return path.replaceAll("\\", "/");
}

function toMsysPath(path) {
  const bashPath = toBashPath(path);
  const driveMatch = /^([A-Za-z]):\/(.*)$/u.exec(bashPath);
  if (!driveMatch) {
    return bashPath;
  }
  return `/${driveMatch[1].toLowerCase()}/${driveMatch[2]}`;
}

function findBash() {
  if (process.platform !== "win32") {
    return "bash";
  }

  const candidates = [
    "C:\\Program Files\\Git\\bin\\bash.exe",
    "C:\\Program Files\\Git\\usr\\bin\\bash.exe",
  ];
  const match = candidates.find(existsSync);
  if (!match) {
    throw new Error("Git for Windows Bash is required for deployment script tests");
  }
  return match;
}

function writeExecutable(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents, "utf8");
  chmodSync(path, 0o755);
}

function createHarness() {
  const root = mkdtempSync(join(tmpdir(), "spellbook-deploy-test-"));
  const bin = join(root, "bin");
  const home = join(root, "home");
  const state = join(root, "state");
  const log = join(root, "events.log");
  mkdirSync(bin, { recursive: true });
  mkdirSync(home, { recursive: true });
  mkdirSync(state, { recursive: true });
  writeFileSync(log, "", "utf8");

  const stub = (name, contents) =>
    writeExecutable(join(bin, name), `#!/usr/bin/env bash\n${contents}`);

  stub(
    "sudo",
    `printf 'sudo %s\\n' "$*" >> "$FAKE_LOG"\nexec "$@"\n`,
  );
  stub("chown", `exit 0\n`);
  stub("chmod", `exit 0\n`);
  stub(
    "install",
    `positionals=()\nwhile [ "$#" -gt 0 ]; do\n  case "$1" in\n    -m|-o|-g) shift 2 ;;\n    *) positionals+=("$1"); shift ;;\n  esac\ndone\ncp "\${positionals[0]}" "\${positionals[1]}"\n`,
  );
  stub(
    "sqlite3",
    `printf 'sqlite3 %s\\n' "$*" >> "$FAKE_LOG"\ncase "$*" in\n  *wal_checkpoint*) printf '%s\\n' "\${FAKE_CHECKPOINT_RESULT:-0|0|0}" ;;\n  *integrity_check*) printf '%s\\n' "\${FAKE_INTEGRITY_RESULT:-ok}" ;;\n  *"SELECT count"*) printf '%s\\n' "\${FAKE_SCHEMA_COUNT:-1}" ;;\n  *) exit 1 ;;\nesac\n`,
  );
  stub(
    "systemctl",
    `command_name="\${1:-}"\nprintf 'systemctl %s\\n' "$*" >> "$FAKE_LOG"\ncase "$command_name" in\n  restart)\n    count_file="$FAKE_STATE_DIR/restart-count"\n    count=0\n    [ ! -f "$count_file" ] || count="$(cat "$count_file")"\n    count=$((count + 1))\n    printf '%s' "$count" > "$count_file"\n    if [ "$count" -le "\${FAKE_SYSTEMCTL_RESTART_FAILS:-0}" ]; then exit 1; fi\n    ;;\n  reload)\n    count_file="$FAKE_STATE_DIR/reload-count"\n    count=0\n    [ ! -f "$count_file" ] || count="$(cat "$count_file")"\n    count=$((count + 1))\n    printf '%s' "$count" > "$count_file"\n    if [ "$count" -le "\${FAKE_SYSTEMCTL_RELOAD_FAILS:-0}" ]; then exit 1; fi\n    ;;\nesac\nexit 0\n`,
  );
  stub(
    "curl",
    `count_file="$FAKE_STATE_DIR/curl-count"\ncount=0\n[ ! -f "$count_file" ] || count="$(cat "$count_file")"\ncount=$((count + 1))\nprintf '%s' "$count" > "$count_file"\nprintf 'curl %s\\n' "$*" >> "$FAKE_LOG"\nif [ "$count" -le "\${FAKE_CURL_FAILS:-0}" ]; then exit 22; fi\nexit 0\n`,
  );
  stub("sleep", `exit 0\n`);
  stub(
    "nginx",
    `count_file="$FAKE_STATE_DIR/nginx-count"\ncount=0\n[ ! -f "$count_file" ] || count="$(cat "$count_file")"\ncount=$((count + 1))\nprintf '%s' "$count" > "$count_file"\nprintf 'nginx %s\\n' "$*" >> "$FAKE_LOG"\nif [ "$count" -le "\${FAKE_NGINX_FAILS:-0}" ]; then exit 1; fi\nexit 0\n`,
  );

  const env = {
    ...process.env,
    PATH: `${toMsysPath(bin)}:/usr/bin:/bin`,
    HOME: toMsysPath(home),
    FAKE_BIN: toMsysPath(bin),
    FAKE_LOG: toMsysPath(log),
    FAKE_STATE_DIR: toMsysPath(state),
  };

  return {
    root,
    bin,
    home,
    state,
    log,
    env,
    stub,
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

function runBash(args, env) {
  return spawnSync(
    findBash(),
    [
      "-c",
      'export PATH="$1:/usr/bin:/bin"; shift; exec bash "$@"',
      "deployment-script-test",
      env.FAKE_BIN,
      ...args,
    ],
    {
      cwd: repoRoot,
      env,
      encoding: "utf8",
    },
  );
}

function runScript(relativePath, env) {
  return runBash([toBashPath(join(repoRoot, relativePath))], env);
}

function readEvents(harness) {
  return readFileSync(harness.log, "utf8")
    .split(/\r?\n/u)
    .filter(Boolean);
}

function indexOfEvent(events, predicate, start = 0) {
  const relative = events.slice(start).findIndex(predicate);
  return relative === -1 ? -1 : start + relative;
}

test("update-db rejects failed SQLite integrity before stopping the API", () => {
  const harness = createHarness();
  try {
    const incoming = join(harness.root, "incoming");
    const target = join(harness.root, "target");
    mkdirSync(incoming);
    mkdirSync(target);
    writeFileSync(join(incoming, "spellbook.db"), "incoming", "utf8");
    writeFileSync(join(target, "spellbook.db"), "active", "utf8");

    const result = runScript("docs/deployment-scripts/update-db.sh", {
      ...harness.env,
      SPELLBOOK_INCOMING_DATA_DIR: toBashPath(incoming),
      SPELLBOOK_TARGET_DIR: toBashPath(target),
      SPELLBOOK_SMOKE_RETRIES: "1",
      SPELLBOOK_SMOKE_DELAY_SECONDS: "0",
      FAKE_INTEGRITY_RESULT: "corrupt",
    });

    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stderr, /failed SQLite integrity validation/u);
    assert.equal(readFileSync(join(target, "spellbook.db"), "utf8"), "active");
    assert.doesNotMatch(readFileSync(harness.log, "utf8"), /systemctl stop/u);
  } finally {
    harness.cleanup();
  }
});

test("update-db checkpoints after stop and restores prior DB after smoke failure", () => {
  const harness = createHarness();
  try {
    const incoming = join(harness.root, "incoming");
    const target = join(harness.root, "target");
    const targetDb = join(target, "spellbook.db");
    mkdirSync(incoming);
    mkdirSync(target);
    writeFileSync(join(incoming, "spellbook.db"), "incoming", "utf8");
    writeFileSync(targetDb, "active", "utf8");
    writeFileSync(`${targetDb}-wal`, "wal", "utf8");
    writeFileSync(`${targetDb}-shm`, "shm", "utf8");

    const result = runScript("docs/deployment-scripts/update-db.sh", {
      ...harness.env,
      SPELLBOOK_INCOMING_DATA_DIR: toBashPath(incoming),
      SPELLBOOK_TARGET_DIR: toBashPath(target),
      SPELLBOOK_SMOKE_RETRIES: "1",
      SPELLBOOK_SMOKE_DELAY_SECONDS: "0",
      FAKE_CURL_FAILS: "1",
    });

    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.equal(readFileSync(targetDb, "utf8"), "active");
    assert.equal(existsSync(`${targetDb}-wal`), false);
    assert.equal(existsSync(`${targetDb}-shm`), false);
    assert.equal(
      readdirSync(target).filter((name) => name.includes(".bak.")).length,
      1,
    );

    const events = readEvents(harness);
    const stageValidation = indexOfEvent(
      events,
      (line) => line.includes("sqlite3 -readonly") && line.includes(".incoming."),
    );
    const firstStop = indexOfEvent(events, (line) => line.startsWith("systemctl stop"));
    const checkpoint = indexOfEvent(events, (line) => line.includes("wal_checkpoint"));
    const backup = indexOfEvent(
      events,
      (line) => line.includes("sudo cp -a") && line.includes(".bak."),
    );
    const swap = indexOfEvent(
      events,
      (line) => line.includes("sudo mv -f") && line.includes(".incoming."),
    );
    const firstRestart = indexOfEvent(
      events,
      (line) => line.startsWith("systemctl restart"),
    );
    const firstCurl = indexOfEvent(events, (line) => line.startsWith("curl "));
    const rollbackStop = indexOfEvent(
      events,
      (line) => line.startsWith("systemctl stop"),
      firstStop + 1,
    );
    const restore = indexOfEvent(
      events,
      (line) =>
        line.includes("sudo cp -a") &&
        line.includes(".bak.") &&
        line.endsWith("spellbook.db"),
      backup + 1,
    );
    const rollbackRestart = indexOfEvent(
      events,
      (line) => line.startsWith("systemctl restart"),
      firstRestart + 1,
    );

    assert.ok(stageValidation >= 0 && stageValidation < firstStop);
    assert.ok(firstStop < checkpoint && checkpoint < backup && backup < swap);
    assert.ok(swap < firstRestart && firstRestart < firstCurl);
    assert.ok(firstCurl < rollbackStop && rollbackStop < restore);
    assert.ok(restore < rollbackRestart);
  } finally {
    harness.cleanup();
  }
});

test("deploy-backend rejects a remote HEAD mismatch before build or activation", () => {
  const harness = createHarness();
  try {
    const repo = join(harness.home, "dnd3.5-spellbook");
    mkdirSync(repo, { recursive: true });
    const expected = "a".repeat(40);
    const mismatch = "b".repeat(40);
    harness.stub(
      "git",
      `printf 'git %s\\n' "$*" >> "$FAKE_LOG"\ncase "$*" in\n  "fetch --prune github"|"reset --hard $FAKE_EXPECTED"|"clean -fd") exit 0 ;;\n  "rev-parse $FAKE_EXPECTED^{commit}") printf '%s\\n' "$FAKE_EXPECTED" ;;\n  "rev-parse HEAD") printf '%s\\n' "$FAKE_MISMATCH" ;;\n  *) exit 1 ;;\nesac\n`,
    );
    harness.stub("npm", `printf 'npm %s\\n' "$*" >> "$FAKE_LOG"\nexit 0\n`);

    const deployEnv = {
      ...harness.env,
      SPELLBOOK_REPO_DIR: toBashPath(repo),
      FAKE_EXPECTED: expected,
      FAKE_MISMATCH: mismatch,
    };
    const result = runBash(
      [
        toBashPath(join(repoRoot, "docs/deployment-scripts/deploy-backend.sh")),
        expected,
        "123",
        "1",
      ],
      deployEnv,
    );

    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stderr, /Remote HEAD mismatch/u);
    assert.doesNotMatch(readFileSync(harness.log, "utf8"), /^npm /mu);
    assert.doesNotMatch(readFileSync(harness.log, "utf8"), /systemctl/u);
  } finally {
    harness.cleanup();
  }
});

test("deploy-backend restores the prior DB when verified runtime smoke fails", () => {
  const harness = createHarness();
  try {
    const repo = join(harness.home, "dnd3.5-spellbook");
    const incoming = join(harness.root, "incoming");
    const target = join(harness.root, "runtime");
    const targetData = join(target, "data");
    const targetDb = join(targetData, "spellbook.db");
    const envFile = join(harness.root, "spellbook.env");
    const expected = "c".repeat(40);
    mkdirSync(repo, { recursive: true });
    mkdirSync(incoming);
    mkdirSync(targetData, { recursive: true });
    writeFileSync(join(incoming, "spellbook.db"), "incoming", "utf8");
    writeFileSync(targetDb, "active", "utf8");

    harness.stub(
      "git",
      `printf 'git %s\\n' "$*" >> "$FAKE_LOG"\ncase "$*" in\n  "fetch --prune github"|"reset --hard $FAKE_EXPECTED"|"clean -fd") exit 0 ;;\n  "rev-parse $FAKE_EXPECTED^{commit}"|"rev-parse HEAD") printf '%s\\n' "$FAKE_EXPECTED" ;;\n  "rev-parse --short=7 HEAD") printf '%s\\n' "${expected.slice(0, 7)}" ;;\n  "branch -r --contains $FAKE_EXPECTED --sort=refname --format=%(refname:short)") printf '%s\\n' "github/main" ;;\n  *) exit 1 ;;\nesac\n`,
    );
    harness.stub("npm", `printf 'npm %s\\n' "$*" >> "$FAKE_LOG"\nexit 0\n`);
    harness.stub("node", `printf 'node %s\\n' "$*" >> "$FAKE_LOG"\nprintf 'v1.2.1\\n'\n`);
    harness.stub("rsync", `printf 'rsync %s\\n' "$*" >> "$FAKE_LOG"\nexit 0\n`);

    const result = runBash(
      [
        toBashPath(join(repoRoot, "docs/deployment-scripts/deploy-backend.sh")),
        expected,
        "456",
        "2",
      ],
      {
        ...harness.env,
        SPELLBOOK_REPO_DIR: toBashPath(repo),
        SPELLBOOK_TARGET_DIR: toBashPath(target),
        SPELLBOOK_INCOMING_DATA_DIR: toBashPath(incoming),
        SPELLBOOK_ENV_FILE: toBashPath(envFile),
        SPELLBOOK_SMOKE_RETRIES: "1",
        SPELLBOOK_SMOKE_DELAY_SECONDS: "0",
        FAKE_CURL_FAILS: "1",
        FAKE_EXPECTED: expected,
      },
    );

    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.equal(readFileSync(targetDb, "utf8"), "active");
    assert.match(
      readFileSync(envFile, "utf8"),
      new RegExp(`SPELLBOOK_BACKEND_COMMIT_SHA="${expected}"`, "u"),
    );

    const events = readEvents(harness);
    const verifiedHead = indexOfEvent(
      events,
      (line) => line === "git rev-parse HEAD",
    );
    const build = indexOfEvent(events, (line) => line === "npm run -w server build");
    const stageValidation = indexOfEvent(
      events,
      (line) => line.includes("sqlite3 -readonly") && line.includes(".incoming."),
    );
    const stop = indexOfEvent(events, (line) => line.startsWith("systemctl stop"));
    const sync = indexOfEvent(events, (line) => line.startsWith("rsync "));
    const swap = indexOfEvent(
      events,
      (line) => line.includes("sudo mv -f") && line.includes(".incoming."),
    );
    const failedSmoke = indexOfEvent(events, (line) => line.startsWith("curl "));
    const restore = indexOfEvent(
      events,
      (line) =>
        line.includes("sudo cp -a") &&
        line.includes(".bak.") &&
        line.endsWith("spellbook.db"),
      failedSmoke + 1,
    );

    assert.ok(verifiedHead < build && build < stageValidation);
    assert.ok(stageValidation < stop && stop < sync && sync < swap);
    assert.ok(swap < failedSmoke && failedSmoke < restore);
  } finally {
    harness.cleanup();
  }
});

function prepareNginxHarness() {
  const harness = createHarness();
  const available = join(harness.root, "sites-available");
  const enabled = join(harness.root, "sites-enabled");
  mkdirSync(available);
  mkdirSync(enabled);
  writeFileSync(join(available, "spellbook"), "old-site\n", "utf8");
  writeFileSync(join(enabled, "spellbook"), "enabled\n", "utf8");
  writeFileSync(join(enabled, "default"), "old-default\n", "utf8");
  return { harness, available, enabled };
}

test("apply-nginx-site restores the prior site when candidate validation fails", () => {
  const { harness, available, enabled } = prepareNginxHarness();
  try {
    const result = runScript("docs/deployment-scripts/apply-nginx-site.sh", {
      ...harness.env,
      SPELLBOOK_NGINX_SITES_AVAILABLE_DIR: toBashPath(available),
      SPELLBOOK_NGINX_SITES_ENABLED_DIR: toBashPath(enabled),
      FAKE_NGINX_FAILS: "1",
    });

    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.equal(readFileSync(join(available, "spellbook"), "utf8"), "old-site\n");
    assert.equal(readFileSync(join(enabled, "default"), "utf8"), "old-default\n");
    assert.equal(
      readEvents(harness).filter((line) => line.startsWith("systemctl reload nginx"))
        .length,
      1,
    );
  } finally {
    harness.cleanup();
  }
});

test("apply-nginx-site restores and reloads the prior site when candidate reload fails", () => {
  const { harness, available, enabled } = prepareNginxHarness();
  try {
    const result = runScript("docs/deployment-scripts/apply-nginx-site.sh", {
      ...harness.env,
      SPELLBOOK_NGINX_SITES_AVAILABLE_DIR: toBashPath(available),
      SPELLBOOK_NGINX_SITES_ENABLED_DIR: toBashPath(enabled),
      FAKE_SYSTEMCTL_RELOAD_FAILS: "1",
    });

    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.equal(readFileSync(join(available, "spellbook"), "utf8"), "old-site\n");
    assert.equal(readFileSync(join(enabled, "default"), "utf8"), "old-default\n");

    const events = readEvents(harness);
    const firstReload = indexOfEvent(
      events,
      (line) => line.startsWith("systemctl reload nginx"),
    );
    const restore = indexOfEvent(
      events,
      (line) =>
        line.includes("sudo cp -a") &&
        line.includes(".bak.") &&
        line.endsWith("/spellbook"),
      firstReload + 1,
    );
    const secondReload = indexOfEvent(
      events,
      (line) => line.startsWith("systemctl reload nginx"),
      firstReload + 1,
    );
    assert.ok(firstReload >= 0 && firstReload < restore && restore < secondReload);
  } finally {
    harness.cleanup();
  }
});

test("workflow uploads the reviewed helper and helper derives metadata from verified HEAD", () => {
  const workflow = readFileSync(join(repoRoot, ".github/workflows/deploy.yml"), "utf8");
  const helper = readFileSync(
    join(repoRoot, "docs/deployment-scripts/deploy-backend.sh"),
    "utf8",
  );
  const updateHelper = readFileSync(
    join(repoRoot, "docs/deployment-scripts/update-db.sh"),
    "utf8",
  );

  assert.match(
    workflow,
    /scp[\s\S]*docs\/deployment-scripts\/deploy-backend\.sh[\s\S]*REMOTE_DEPLOY_SCRIPT/u,
  );
  assert.match(
    workflow,
    /"\$REMOTE_DEPLOY_SCRIPT" "\$GITHUB_SHA" "\$GITHUB_RUN_ID" "\$GITHUB_RUN_ATTEMPT"/u,
  );
  assert.doesNotMatch(workflow, /~\/deploy-backend\.sh/u);
  assert.match(helper, /git reset --hard "\$EXPECTED_COMMIT"/u);
  assert.match(helper, /if \[ "\$VERIFIED_COMMIT" != "\$EXPECTED_COMMIT" \]/u);
  assert.match(
    helper,
    /upsert_env_var "SPELLBOOK_BACKEND_COMMIT_SHA" "\$VERIFIED_COMMIT"/u,
  );
  assert.doesNotMatch(helper, /SPELLBOOK_BACKEND_COMMIT_SHA:-/u);
  for (const dbHelper of [helper, updateHelper]) {
    assert.match(dbHelper, /SpellSearchIndexState SpellSearchDocument/u);
    assert.doesNotMatch(dbHelper, /SpellSearchIndexState SpellSearchIndex(?:\s|$)/u);
  }
});
