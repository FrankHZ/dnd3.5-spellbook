# Deployment

This document describes the current manual deployment workflow used for the project.

It is intentionally simple and optimized for the current stage of the project:

- single host
- low traffic
- explicit manual control
- separate code deploy and database update

## Canonical Scripts

The canonical deployment assets are tracked in:

- `docs/deployment-scripts/deploy-backend.sh`
- `docs/deployment-scripts/deploy-web.sh`
- `docs/deployment-scripts/update-db.sh`
- `docs/deployment-scripts/apply-nginx-site.sh`
- `docs/deployment-scripts/sync-remote-scripts.ps1`
- `docs/deployment-scripts/spellbook-api.env.example`
- `.env.example`

The shell scripts are the source of truth for remote deployment behavior. The
PowerShell helper only syncs those tracked scripts to the SSH host configured in
local `.env`.

Any local root-level `.bat` files are treated as ignored, machine-specific convenience wrappers only. They may call into the same workflow, but they are not canonical and should not be treated as the authoritative deploy logic.

## GitHub Actions Manual Deploy

The tracked GitHub Actions deploy workflow is:

- `.github/workflows/deploy.yml`

It is a manual `workflow_dispatch` wrapper around the canonical scripts. It is
not a second deployment implementation.

Supported targets:

- `backend`: runs portable validation, then invokes `~/deploy-backend.sh` on the
  remote host.
- `web`: runs portable validation, builds `web`, uploads `web/build/client/` to
  the remote staging directory, then invokes `~/deploy-web.sh`.
- `backend-and-web`: combines the backend and web paths.

Required repository secrets:

- `DEPLOY_SSH_HOST`
- `DEPLOY_SSH_USER`
- `DEPLOY_SSH_PRIVATE_KEY`

Optional repository variables:

- `DEPLOY_SSH_PORT`, default `22`
- `DEPLOY_REMOTE_WEB_DIST_DIR`, default `spellbook-dist`

Recommended repository secrets:

- `DEPLOY_SSH_KNOWN_HOSTS`: pinned SSH `known_hosts` line for the deployment
  host. If absent, the workflow falls back to `ssh-keyscan` with a warning for
  current convenience.

Portable validation is enabled by default for every manual deploy. Disable the
`runPortableValidation` input only for an emergency rollback where the operator
has already accepted the risk.

The workflow injects deploy metadata for the About / Version page:

- web builds receive `VITE_SPELLBOOK_*` values derived from the GitHub run,
  commit, ref, and build time
- backend deploys pass `SPELLBOOK_BACKEND_*` values to `deploy-backend.sh`,
  which writes the non-secret metadata into `/etc/default/spellbook-api` before
  restarting the service

The deploy workflow does not automatically sync changed files under
`docs/deployment-scripts/` to the remote host. If those tracked scripts change,
copy them to the remote targets first, then run the workflow.

Database deployment is intentionally not a GitHub Actions target yet. The
current DB update path still depends on operator-controlled SQLite file uploads
to `~/data/`, so it should stay manual until the v3.5 content DB / app-state DB
redesign defines a safer release artifact and activation model.

The v3.5 normalized rules-content work does not change that boundary. GitHub
Actions deploys code/web only. Data-bearing SQLite files remain operator-owned
artifacts; do not add generated DB uploads to CD until a separate artifact and
rollback model is accepted.

## Remote Script Sync Policy

The remote host copies of the deploy scripts are updated manually.

If any tracked remote shell script under `docs/deployment-scripts/` changes,
recopy it to the remote host. The local helper reads `DEPLOY_SSH_ALIAS` from the
ignored root `.env`, so the docs can keep using `remote` as a placeholder while
your machine can keep its actual SSH alias private.

Current remote targets:

- `~/deploy-backend.sh`
- `~/deploy-web.sh`
- `~/update-db.sh`
- `~/apply-nginx-site.sh`
- `/etc/default/spellbook-api` for the environment values adapted from
  `docs/deployment-scripts/spellbook-api.env.example`

Example:

```bash
scp docs/deployment-scripts/deploy-backend.sh remote:~/deploy-backend.sh
scp docs/deployment-scripts/deploy-web.sh remote:~/deploy-web.sh
scp docs/deployment-scripts/update-db.sh remote:~/update-db.sh
scp docs/deployment-scripts/apply-nginx-site.sh remote:~/apply-nginx-site.sh
```

Local helper:

```powershell
Copy-Item .env.example .env
# Edit .env and set DEPLOY_SSH_ALIAS to your real local SSH alias.
pwsh -NoLogo -NoProfile -File docs/deployment-scripts/sync-remote-scripts.ps1
```

There is no automatic sync for these files in the current MVP workflow.

## Nginx Site Config

The tracked Nginx site apply script is:

- `docs/deployment-scripts/apply-nginx-site.sh`

It writes `/etc/nginx/sites-available/spellbook`, enables it, removes the
default site, runs `nginx -t`, and reloads Nginx. It preserves the current
single-host assumptions:

- static frontend root: `/var/www/spellbook`
- API upstream: `http://127.0.0.1:3000`
- `/locales/` returns `404` for missing locale JSON instead of falling through
  to the SPA
- hashed static assets receive immutable cache headers

Apply after syncing scripts:

```bash
ssh remote "chmod 755 ~/apply-nginx-site.sh && ~/apply-nginx-site.sh"
```

Override only when deliberately changing host layout:

```bash
ssh remote "SPELLBOOK_FRONTEND_ROOT=/var/www/spellbook SPELLBOOK_API_UPSTREAM=http://127.0.0.1:3000 ~/apply-nginx-site.sh"
```

## Host Placeholder

This document uses `remote` as a placeholder SSH host alias.

Examples such as:

```bash
ssh remote "./deploy-web.sh"
```

assume you have an SSH config entry or equivalent host setup for your actual
deployment target. Local helper scripts should read the actual alias from
ignored `.env` instead of hardcoding it in docs or tracked scripts.

## Infrastructure Overview

Current deployment target:

- AWS Lightsail
- Debian 12
- single instance

Current runtime stack:

- Nginx as the public entry point on port `80`
- Express backend managed by `systemd`
- SQLite databases stored as local files
- React frontend served as static assets

## Server Layout

Application directories:

```text
/opt/spellbook/
  |- server/
  |- contracts/
  |- data/
     |- spellbook.db
     |- content.sqlite
     |- app-state.sqlite
  |- ...
```

Frontend static root:

```text
/var/www/spellbook/
```

Staging directories used by the current scripts:

```text
~/spellbook-dist/   # uploaded frontend build before deploy-web.sh
~/data/             # uploaded DB files before update-db.sh or deploy-backend.sh
~/dnd3.5-spellbook/ # git checkout used by deploy-backend.sh
```

## Services

### Backend Service

Service name:

```bash
spellbook-api
```

Common commands:

```bash
sudo systemctl restart spellbook-api
sudo systemctl status spellbook-api
sudo journalctl -u spellbook-api -n 100
```

Environment file:

```text
/etc/default/spellbook-api
```

Example values:

```dotenv
NODE_ENV=production
PORT=3000
HOST=127.0.0.1

RULES_DATABASE_URL=file:/opt/spellbook/data/spellbook.db
CONTENT_DATABASE_URL=file:/opt/spellbook/data/content.sqlite
APP_DATABASE_URL=file:/opt/spellbook/data/content.sqlite
APP_STATE_DATABASE_URL=file:/opt/spellbook/data/app-state.sqlite
DATABASE_URL=file:/opt/spellbook/data/spellbook.db

# Optional. Same-origin static web/API deployments do not need this.
# SPELLBOOK_CORS_ORIGINS=https://spellbook.example
```

The current remote has switched to explicit content DB naming:
`CONTENT_DATABASE_URL` points at `/opt/spellbook/data/content.sqlite`.
`APP_DATABASE_URL` remains a compatibility alias for the same content DB only.
The old incoming filename `~/data/app.db` is accepted by the deployment scripts
as a temporary fallback, but new uploads should use `~/data/content.sqlite`.

Spell reads use normalized rules-content from `CONTENT_DATABASE_URL` by default
after the remote `content.sqlite` has been verified to contain the normalized
content tables and a current `RulesContentBuild` row. Keep this default for
normal production operation.

Use the legacy rules DB read path only as an explicit rollback switch:

```dotenv
SPELL_READ_SOURCE=rules
```

Leaving `SPELL_READ_SOURCE` unset uses the normalized content-backed read path.

Backend version metadata is optional in local/manual environments. GitHub
backend deploys refresh it automatically:

```dotenv
SPELLBOOK_VERSION_LABEL=v3.7
SPELLBOOK_BACKEND_COMMIT_SHA=
SPELLBOOK_BACKEND_SHORT_SHA=
SPELLBOOK_BACKEND_REF=
SPELLBOOK_BACKEND_DEPLOYED_AT=
SPELLBOOK_BACKEND_GITHUB_RUN_ID=
SPELLBOOK_BACKEND_GITHUB_RUN_ATTEMPT=
```

When these values are absent, `GET /api/status/app` reports a local fallback
instead of inspecting Git state at request time. The same public endpoint also
returns a redacted content DB summary used by the About / Version page.

Runtime database provenance is available through `GET /api/status/db`, but in
production it is private by default because it reports database file roles,
content build metadata, hashes, and table counts. Configure an operator token
in `/etc/default/spellbook-api` when remote DB verification is needed:

```dotenv
SPELLBOOK_DB_STATUS_TOKEN=<operator-only-token>
```

Operator checks should send either:

```bash
curl -fsS -H "Authorization: Bearer $SPELLBOOK_DB_STATUS_TOKEN" \
  http://127.0.0.1:3000/api/status/db
```

or:

```bash
curl -fsS -H "X-Spellbook-Operations-Token: $SPELLBOOK_DB_STATUS_TOKEN" \
  http://127.0.0.1:3000/api/status/db
```

Only set `ENABLE_DB_STATUS_PUBLIC=true` when the DB provenance endpoint is
intentionally public.

The backend should only listen on:

```text
127.0.0.1:3000
```

### API Security Headers And CORS

The Express API sends a baseline set of response headers on all API responses:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Cross-Origin-Resource-Policy: same-origin`
- a restrictive API-only `Content-Security-Policy`

Production CORS is explicit. If `SPELLBOOK_CORS_ORIGINS` is unset in
production, browser requests from arbitrary external origins do not receive
`Access-Control-Allow-Origin`. Same-origin static web/API deployments continue
to work through Nginx without CORS.

Use a comma-separated allowlist only when a trusted external browser origin must
call the API:

```dotenv
SPELLBOOK_CORS_ORIGINS=https://spellbook.example,https://www.spellbook.example
```

TLS is still an operations item. Add HSTS only after HTTPS termination is
configured and verified for the production domain.

### Nginx

Nginx is the public entry point on port `80`.

Expected routing:

- `/` serves static assets from `/var/www/spellbook`
- `/locales/*` serves checked-in frontend i18n JSON files and returns `404`
  when a locale file is missing
- `/api/*` proxies to `http://127.0.0.1:3000`

Common commands:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Frontend Deployment

The frontend is built locally and deployed as static files.

This is intentional because the remote host is not the preferred place to do the frontend build.

### Local Build

```bash
set VITE_API_BASE_URL=/api
npm run -w web build
```

GitHub web deploys also provide frontend version metadata through
`VITE_SPELLBOOK_*` variables. Manual local builds may omit these values; the
About / Version page then shows a local fallback for the frontend build.

### Upload

```bash
scp -r web/build/client/* remote:~/spellbook-dist
```

### Activate On Remote

```bash
ssh remote "./deploy-web.sh"
```

### What `deploy-web.sh` Does

The tracked script in `docs/deployment-scripts/deploy-web.sh` performs:

1. Ensures `/var/www/spellbook` exists
2. Deletes existing contents under `/var/www/spellbook`
3. Copies files from `~/spellbook-dist/` into `/var/www/spellbook/`
4. Resets ownership to `www-data:www-data`
5. Resets directory permissions to `755`
6. Resets file permissions to `644`
7. Validates Nginx config
8. Reloads Nginx

## Database Update

Database updates are intentionally separate from code deploy.

This reduces the blast radius and allows database replacement without shipping new application code.

### Upload Local Databases

```bash
scp .\server\db\local\rules-clean.sqlite remote:~/data/spellbook.db
scp .\server\db\local\content.sqlite remote:~/data/content.sqlite
scp .\server\db\local\app-state.sqlite remote:~/data/app-state.sqlite
```

Before uploading a content DB intended for default normalized spell reads, run
the local gates:

```bash
npm run -w data-tools rules:content:parity
npm run -w data-tools rules:content:meta
```

The parity gate compares the locked rules DB against the normalized content DB.
The meta command writes a local report under `data-tools/out/rules-content/`
with the content DB checksum, generated content counts, `RulesContentBuild`
hashes, and parent/data repo commit ids. Keep that report for operator
comparison; do not commit it or upload it through GitHub Actions.

### Activate On Remote

```bash
ssh remote "./update-db.sh"
```

After activation, verify the remote content DB metadata before relying on the
default normalized read path. In production this endpoint requires the operator
token unless `ENABLE_DB_STATUS_PUBLIC=true` has been intentionally set:

```bash
curl -fsS -H "Authorization: Bearer $SPELLBOOK_DB_STATUS_TOKEN" \
  http://127.0.0.1:3000/api/status/db
```

Compare the response with the local `rules:content:meta` report. At minimum,
check:

- `activeSpellReadSource` is `content` for normal production operation.
- `databases.content.fileName` is `content.sqlite`.
- `databases.content.exists` is `true`.
- `databases.contentAlias.matchesContent` is `true` when `APP_DATABASE_URL` is
  still configured.
- `content.latestBuild.parentRepoCommit`
- `content.latestBuild.dataRepoCommit`
- `content.latestBuild.spellCount`
- `content.latestBuild.issueCount`
- `content.latestBuild.rulesDbSha256`
- `content.latestBuild.migrationSetSha256`
- `content.tableCounts`

The metadata inside `content.sqlite` remains the normalized-content provenance
signal. The API is a read-only runtime view of that state; it does not upload,
activate, or migrate DB files.

### What `update-db.sh` Does

The tracked script in `docs/deployment-scripts/update-db.sh` performs:

1. Ensures `/opt/spellbook/data` exists with `spellbook:spellbook` ownership
2. Checks whether incoming files exist under `~/data`
3. Compares incoming and target checksums
4. Skips unchanged files
5. Creates timestamped backups before replacement when a target DB exists
6. Copies incoming files via a temp file and moves them into place
7. Removes stale `-wal` and `-shm` files
8. Restarts `spellbook-api`
9. Smoke-tests `http://127.0.0.1:3000/api/rulebooks` with short retries

The script updates these target files when matching incoming files exist:

- `~/data/spellbook.db` -> `/opt/spellbook/data/spellbook.db`
- `~/data/content.sqlite` -> `/opt/spellbook/data/content.sqlite`
- `~/data/app-state.sqlite` -> `/opt/spellbook/data/app-state.sqlite`

For transition compatibility, `~/data/app.db` is still accepted as a legacy
incoming content DB filename when `~/data/content.sqlite` is absent.

### Backup Retention

`update-db.sh` and `deploy-backend.sh` create timestamped backups next to the
target DB before replacement. Keep enough backups for the current release
window, then prune intentionally so `/opt/spellbook/data` does not grow without
bound.

Current operator policy:

- keep at least the latest successful backup for each DB role
- keep backups from recent manual deploy/update work until the release has been
  accepted
- prune older `*.bak.YYYYMMDDTHHMMSSZ` files manually after confirming the
  active DB status endpoint matches the accepted local metadata

## Backend Deployment

The backend deployment script handles code sync and can also replace databases
from `~/data` if new DB files were uploaded before the deploy.

On small hosts, backend TypeScript builds can need more heap than Node infers
from the machine default. `deploy-backend.sh` uses
`SPELLBOOK_NODE_MAX_OLD_SPACE_SIZE=384` by default and passes it through
`NODE_OPTIONS`. Override it only when the remote host memory profile changes:

```bash
SPELLBOOK_NODE_MAX_OLD_SPACE_SIZE=512 ~/deploy-backend.sh
```

### Activate On Remote

```bash
ssh remote "./deploy-backend.sh"
```

### What `deploy-backend.sh` Does

The tracked script in `docs/deployment-scripts/deploy-backend.sh` performs:

1. Ensures `/opt/spellbook/data` exists with correct ownership and permissions
2. Optionally replaces `spellbook.db`, `content.sqlite`, and
   `app-state.sqlite` from `~/data` if changed
3. Enters `~/dnd3.5-spellbook`
4. Runs `git reset --hard`
5. Runs `git clean -fd`
6. Runs `git pull --ff-only`
7. Runs `npm ci` with configurable constrained `NODE_OPTIONS`
8. Runs `npm run -w server db:generate`
9. Runs `npm run build:contracts`
10. Runs `npm run check:contracts`
11. Runs `npm run -w server build`
12. `rsync`s the repo into `/opt/spellbook` with `--exclude 'data/'`
13. Reapplies ownership
14. Writes backend deploy metadata to `/etc/default/spellbook-api`
15. Restarts `spellbook-api`
16. Smoke-tests `http://127.0.0.1:3000/api/rulebooks` with short retries

## Important Invariants

These should remain true unless the deployment model is deliberately changed:

- SQLite runtime data lives under `/opt/spellbook/data`
- `data/` must be preserved across code sync
- the backend environment is defined by `/etc/default/spellbook-api`
- the backend binds only to `127.0.0.1:3000`
- Nginx is the only public service on port `80`
- backend builds use plain `tsc`; server package imports must resolve through
  `server/package.json`
- deployment remains explicit and manual

## Operational Risks

Be aware of these characteristics in the current scripts:

- `deploy-web.sh` deletes all existing files in `/var/www/spellbook` before copying the new build
- `deploy-backend.sh` runs `git reset --hard` and `git clean -fd` in the remote checkout
- backend deploy and DB update both restart the backend service
- deploying backend code that uses default normalized reads before verifying
  the current `content.sqlite` can route API reads to missing or stale normalized
  content tables

These behaviors are acceptable for the current single-operator setup, but they are intentionally not a general CI/CD system.

## Common Failure Patterns

### Cannot Open Database File

Check:

- the absolute paths in `/etc/default/spellbook-api`
- ownership and permissions under `/opt/spellbook/data`
- that `/opt/spellbook/data` exists
- that uploaded files actually reached `~/data`

### Cannot Find Module Or Path Alias Errors

Check:

- that `npm run -w server build` completed successfully
- that `npm run -w server check:runtime` passes after the build
- that any new server import uses runtime-resolvable package imports such as
  `#server/*` or `#prisma-*/*`
- that `/opt/spellbook` received the updated `dist/` output

### Git Pull Fails During Backend Deploy

Check:

- the remote repo is reachable
- the remote checkout is still under `~/dnd3.5-spellbook`
- local remote-only edits were not expected to survive `git reset --hard` and `git clean -fd`

### Nginx Reload Fails

Check:

- `sudo nginx -t`
- ownership and permissions under `/var/www/spellbook`
- that the copied frontend assets are complete

### UI Shows i18n Keys

If UI text renders as keys such as `page.title` or `nav.about`, first check the
static locale files rather than restarting `spellbook-api`:

```bash
curl -i http://127.0.0.1/locales/en/about.json
curl -i http://127.0.0.1/locales/zh/about.json
curl -i http://127.0.0.1/locales/en-US/about.json
```

Existing locale files should return `200` with `Content-Type:
application/json`. Missing locale files should return `404`; they should not
return the SPA `index.html`. If a missing `/locales/...` path returns HTML,
update the Nginx site config so `location /locales/ { try_files $uri =404; }`
appears before the SPA fallback location.

## Current Fit

This setup is currently good enough for:

- early user testing
- low traffic
- manual releases
- simple rollback reasoning

It is not yet meant to provide:

- CI/CD
- auto-scaling
- HA
- managed database infrastructure
- zero-downtime deploy guarantees

## Deferred Security Hardening

The current deployment has API header/CORS defaults, private DB provenance by
default, explicit GitHub workflow permissions, pinned-host-key support, and a
manual backup-retention policy. It is still not a hardened stable-release
posture.

Treat these as follow-up operations work:

- HTTPS / TLS termination and HSTS after TLS is verified
- firewall policy and port restriction
- fail2ban or similar intrusion controls
- stricter SSH lockdown
- automatic security update policy

## Related Files

- `docs/deployment-scripts/deploy-backend.sh`
- `docs/deployment-scripts/deploy-web.sh`
- `docs/deployment-scripts/update-db.sh`
- `server/README.md`
- `web/README.md`
