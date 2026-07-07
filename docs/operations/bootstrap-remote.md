# Remote Host Bootstrap Guide (Debian 12)

This document defines how to prepare a brand-new Lightsail instance to host the application.

It is the one-time host bootstrap companion to [./deployment.md](./deployment.md).

It must be executed once for each new server.

## 1. Initial Server Setup

### 1.1 Connect To The Server

```bash
ssh admin@YOUR_SERVER_IP
```

Update system:

```bash
sudo apt update
sudo apt upgrade -y
```

Install base utilities:

```bash
sudo apt install -y \
  curl \
  git \
  rsync \
  openssh-client \
  build-essential \
  ca-certificates \
  gnupg
```

## 2. Install Node.js (Node 24 LTS)

Use NodeSource (recommended for Debian):

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify:

```bash
node -v
npm -v
```

## 3. Install Nginx

```bash
sudo apt install -y nginx
```

Enable + start:

```bash
sudo systemctl enable nginx
sudo systemctl start nginx
```

Verify:

```bash
sudo systemctl status nginx
```

## 4. Create Dedicated Application User

Create `spellbook` user:

```bash
sudo useradd -r -m -d /opt/spellbook -s /usr/sbin/nologin spellbook
```

Explanation:

- system user
- home directory at `/opt/spellbook`
- no login shell

## 5. Create Required Directories

```bash
sudo mkdir -p /opt/spellbook
sudo mkdir -p /opt/spellbook/data
mkdir -p ~/data
```

Set ownership:

```bash
sudo chown -R spellbook:spellbook /opt/spellbook
sudo chmod 750 /opt/spellbook
sudo chmod 750 /opt/spellbook/data
```

Create the legacy single-origin frontend root only if you need the emergency
same-origin fallback:

```bash
sudo mkdir -p /var/www/spellbook
sudo chown -R www-data:www-data /var/www/spellbook
sudo chmod 755 /var/www/spellbook
```

## 6. Clone Repository (Initial)

Login as admin user:

```bash
cd ~
git clone git@github.com:YOUR_ORG/dnd3.5-spellbook.git
```

(Configure SSH key if needed.)

## 7. Install Backend Dependencies (First Time)

```bash
cd ~/dnd3.5-spellbook
npm ci
npm run -w contracts build
npm run -w server db:generate
npm run -w server build
```

## 8. Initial Code Sync To Runtime Directory

```bash
sudo rsync -a --delete \
  --exclude 'data/' \
  ~/dnd3.5-spellbook/ \
  /opt/spellbook/
```

Ensure ownership:

```bash
sudo chown -R spellbook:spellbook /opt/spellbook
```

## 9. Install Canonical Remote Deploy Scripts

Copy the tracked deployment scripts from the repo into the admin user's home directory so the deployment commands documented in [./deployment.md](./deployment.md) will exist on the remote host.

```bash
cp ~/dnd3.5-spellbook/docs/deployment-scripts/deploy-backend.sh ~/deploy-backend.sh
cp ~/dnd3.5-spellbook/docs/deployment-scripts/deploy-web.sh ~/deploy-web.sh
cp ~/dnd3.5-spellbook/docs/deployment-scripts/update-db.sh ~/update-db.sh
cp ~/dnd3.5-spellbook/docs/deployment-scripts/apply-nginx-site.sh ~/apply-nginx-site.sh
chmod 755 ~/deploy-backend.sh ~/deploy-web.sh ~/update-db.sh ~/apply-nginx-site.sh
```

Verify:

```bash
ls -l ~/deploy-backend.sh ~/deploy-web.sh ~/update-db.sh ~/apply-nginx-site.sh
```

After bootstrap, keep these files in sync manually with `scp` whenever the tracked versions under `docs/deployment-scripts/` change.

## 10. Create systemd Service

Create:

```bash
sudo nano /etc/systemd/system/spellbook-api.service
```

Paste:

```ini
[Unit]
Description=Spellbook API (Express)
After=network.target

[Service]
Type=simple
User=spellbook
Group=spellbook
WorkingDirectory=/opt/spellbook/server
EnvironmentFile=/etc/default/spellbook-api
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=2

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

Reload systemd:

```bash
sudo systemctl daemon-reload
sudo systemctl enable spellbook-api
```

## 11. Create Environment File

```bash
sudo nano /etc/default/spellbook-api
```

Example:

```bash
NODE_ENV=production
PORT=3000
HOST=127.0.0.1

RULES_DATABASE_URL=file:/opt/spellbook/data/spellbook.db
CONTENT_DATABASE_URL=file:/opt/spellbook/data/content.sqlite
APP_DATABASE_URL=file:/opt/spellbook/data/content.sqlite
APP_STATE_DATABASE_URL=file:/opt/spellbook/data/app-state.sqlite
DATABASE_URL=file:/opt/spellbook/data/spellbook.db

SPELLBOOK_CORS_ORIGINS=https://d20spellcodex.com,https://www.d20spellcodex.com
```

Permissions:

```bash
sudo chmod 600 /etc/default/spellbook-api
```

## 12. Configure Nginx

The tracked apply script writes the v1.0 API-only site config, tests it, and
reloads Nginx:

```bash
~/apply-nginx-site.sh
```

The generated config is:

```nginx
server {
    listen 80;
    server_name api.d20spellcodex.com;

    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location = /health {
        proxy_pass http://127.0.0.1:3000;
    }

    location / {
        return 404;
    }
}
```

For Cloudflare Full (strict), configure an origin certificate and run the helper
with `SPELLBOOK_NGINX_ENABLE_SSL=true` plus certificate/key paths. Use
`SPELLBOOK_NGINX_MODE=single-origin` only for the legacy static frontend
fallback.

## 13. Prepare Initial Databases

Database origins:

- The deployed rules database (`spellbook.db`) ultimately comes from the original `dnd.sqlite` dataset available from the `dndtools/dndtools` project, after this repo's local processing pipeline.
- The deployed content database (`content.sqlite`) is project-local and created
  from the Prisma content schema in `server/`.
- The deployed app-state database (`app-state.sqlite`) is reserved for future
  user/app-state data and may initially be empty.

This bootstrap doc assumes you already have local database files ready to upload.

If the local content or app-state database has not been created yet, generate it
from the `server` workspace before proceeding.

### 13.1 Upload Initial Databases

Before the local `remote` SSH alias is configured, upload directly to the
server address:

From local machine:

```bash
scp server/db/local/rules-clean.sqlite admin@YOUR_SERVER_IP:~/data/spellbook.db
scp server/db/local/content.sqlite     admin@YOUR_SERVER_IP:~/data/content.sqlite
scp server/db/local/app-state.sqlite   admin@YOUR_SERVER_IP:~/data/app-state.sqlite
```

Then on server:

```bash
~/update-db.sh
```

## 14. Start Backend

```bash
sudo systemctl start spellbook-api
sudo systemctl status spellbook-api
```

Test locally:

```bash
curl http://127.0.0.1:3000/api/rulebooks
```

Then test public IP.

## 15. SSH Host Alias Setup (Local Machine)

Edit your local `~/.ssh/config`:

```bash
Host remote
  HostName YOUR_SERVER_IP
  User admin
  IdentityFile ~/.ssh/id_ed25519
```

Then connect via:

```bash
ssh remote
```

For tracked helper scripts, keep the actual alias in the ignored root `.env`
file as `DEPLOY_SSH_ALIAS=...` instead of hardcoding it in docs.

## 16. Final Validation Checklist

- nginx running
- backend running
- `/opt/spellbook/data` exists
- DB files owned by spellbook
- Cloudflare Pages frontend accessible
- `/api/rulebooks` works
- No service bound publicly on 3000

Check open ports:

```bash
sudo ss -ltnp
```

## Resulting Architecture

```text
Internet
   ↓
Cloudflare Pages (frontend)
   ↓
api.d20spellcodex.com
   ↓
Nginx (API reverse proxy)
   ↓
Express (127.0.0.1:3000)
   ↓
SQLite (/opt/spellbook/data)
```

## Bootstrap Complete

After this point:

- Use `ssh remote "./deploy-backend.sh"` for backend code deploys
- Use `ssh remote "./update-db.sh"` for database updates
- Use Cloudflare Pages Git integration for frontend deploys

## Security Baseline And Deferred Hardening

The Express API adds a low-cost response header baseline and production CORS is
explicit through `SPELLBOOK_CORS_ORIGINS`. Keep the backend bound to
`127.0.0.1:3000`; Nginx should remain the only public entry point.

This bootstrap guide still does not complete a hardened stable-release posture.
Track these as operations follow-up rather than assuming they are covered by the
MVP bootstrap:

- HTTPS / TLS setup and HSTS after TLS is verified
- firewall hardening
- stricter SSH lockdown
- fail2ban or equivalent intrusion controls
- automated security patch policy
