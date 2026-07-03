# Deployment

This document describes the current manual deployment workflow used for the project.

It is intentionally simple and optimized for the current stage of the project:

- single host
- low traffic
- explicit manual control
- separate code deploy and database update

## Canonical Scripts

The canonical deployment scripts are the tracked shell scripts in:

- `docs/deployment-scripts/deploy-backend.sh`
- `docs/deployment-scripts/deploy-web.sh`
- `docs/deployment-scripts/update-db.sh`

These scripts are the source of truth for deployment behavior.

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

The deploy workflow does not automatically sync changed files under
`docs/deployment-scripts/` to the remote host. If those tracked scripts change,
copy them to the remote targets first, then run the workflow.

Database deployment is intentionally not a GitHub Actions target yet. The
current DB update path still depends on operator-controlled SQLite file uploads
to `~/data/`, so it should stay manual until the v3.5 content DB / app-state DB
redesign defines a safer release artifact and activation model.

## Remote Script Sync Policy

The remote host copies of the deploy scripts are updated manually.

If any tracked file under `docs/deployment-scripts/` changes, recopy it to the remote host with `scp`.

Current remote targets:

- `~/deploy-backend.sh`
- `~/deploy-web.sh`
- `~/update-db.sh`

Example:

```bash
scp docs/deployment-scripts/deploy-backend.sh remote:~/deploy-backend.sh
scp docs/deployment-scripts/deploy-web.sh remote:~/deploy-web.sh
scp docs/deployment-scripts/update-db.sh remote:~/update-db.sh
```

There is no automatic sync for these files in the current MVP workflow.

## Host Placeholder

This document uses `remote` as a placeholder SSH host alias.

Examples such as:

```bash
ssh remote "~/deploy-web.sh"
```

assume you have an SSH config entry or equivalent host setup for your actual deployment target.

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
     |- app.db
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
CONTENT_DATABASE_URL=file:/opt/spellbook/data/app.db
APP_STATE_DATABASE_URL=file:/opt/spellbook/data/app-state.db
DATABASE_URL=file:/opt/spellbook/data/spellbook.db
```

The current deployment scripts still upload the generated content DB as
`app.db`. `CONTENT_DATABASE_URL` should point at that file until the v3.5 DB
deployment redesign gives content and app-state files explicit deploy steps.

The backend should only listen on:

```text
127.0.0.1:3000
```

### Nginx

Nginx is the public entry point on port `80`.

Expected routing:

- `/` serves static assets from `/var/www/spellbook`
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

### Upload

```bash
scp -r web/build/client/* remote:~/spellbook-dist
```

### Activate On Remote

```bash
ssh remote "~/deploy-web.sh"
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
scp .\server\db\local\content.sqlite remote:~/data/app.db
```

### Activate On Remote

```bash
ssh remote "~/update-db.sh"
```

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

## Backend Deployment

The backend deployment script handles code sync and can also replace databases from `~/data` if new DB files were uploaded before the deploy.

### Activate On Remote

```bash
ssh remote "~/deploy-backend.sh"
```

### What `deploy-backend.sh` Does

The tracked script in `docs/deployment-scripts/deploy-backend.sh` performs:

1. Ensures `/opt/spellbook/data` exists with correct ownership and permissions
2. Optionally replaces `spellbook.db` and `app.db` from `~/data` if changed
3. Enters `~/dnd3.5-spellbook`
4. Runs `git reset --hard`
5. Runs `git clean -fd`
6. Runs `git pull --ff-only`
7. Runs `npm ci` with constrained `NODE_OPTIONS`
8. Runs `npm run -w server db:generate`
9. Runs `npm run build:contracts`
10. Runs `npm run check:contracts`
11. Runs `npm run -w server build`
12. `rsync`s the repo into `/opt/spellbook` with `--exclude 'data/'`
13. Reapplies ownership
14. Restarts `spellbook-api`
15. Smoke-tests `http://127.0.0.1:3000/api/rulebooks` with short retries

## Important Invariants

These should remain true unless the deployment model is deliberately changed:

- SQLite runtime data lives under `/opt/spellbook/data`
- `data/` must be preserved across code sync
- the backend environment is defined by `/etc/default/spellbook-api`
- the backend binds only to `127.0.0.1:3000`
- Nginx is the only public service on port `80`
- backend builds use `tsc` plus `tsc-alias`
- deployment remains explicit and manual

## Operational Risks

Be aware of these characteristics in the current scripts:

- `deploy-web.sh` deletes all existing files in `/var/www/spellbook` before copying the new build
- `deploy-backend.sh` runs `git reset --hard` and `git clean -fd` in the remote checkout
- backend deploy and DB update both restart the backend service

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
- that `tsc-alias` is part of the build output path
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

Security hardening is intentionally deferred at the current MVP stage.

This deployment documentation does not yet cover a hardened stable-release posture such as:

- HTTPS / TLS termination
- firewall policy and port restriction
- fail2ban or similar intrusion controls
- stricter SSH lockdown
- automatic security update policy

Those concerns are planned for the future stable-version track and should be treated as a follow-up, not as already-handled by the current MVP deployment flow.

## Related Files

- `docs/deployment-scripts/deploy-backend.sh`
- `docs/deployment-scripts/deploy-web.sh`
- `docs/deployment-scripts/update-db.sh`
- `server/README.md`
- `web/README.md`
