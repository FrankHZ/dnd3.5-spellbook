# D&D 3.5 Spellbook v1.1 – Deployment Notes (Early User Test)

**Scope**

- Small-scale user testing
- Single AWS Lightsail instance
- No CI/CD yet
- No containerization
- SQLite local DB

---

## 1. Architecture Overview

**Server**

- AWS Lightsail (Debian 12)
- One VM

**Services**

- **Nginx**
  - Public entry point (port 80)
  - Serves React SPA static files
  - Reverse-proxies `/api/*` to backend

- **Backend**: Node.js (Express)
  - Managed by `systemd`
  - Listens on `127.0.0.1:3000`

- **Database**: SQLite
  - File-based DB on disk

```
Browser
  ↓
Nginx (:80)
  ├── /        → /var/www/spellbook (React SPA)
  └── /api/*   → http://127.0.0.1:3000
                     ↓
                 Express + Prisma
                     ↓
            SQLite DB (/opt/spellbook/data)
```

---

## 2. Directory Layout (Server)

```
/opt/spellbook/
  ├── server/              # backend workspace
  ├── data/
  │    └── spellbook.db    # SQLite DB (runtime data)
  └── ...                  # repo root (npm workspace)

/var/www/spellbook/
  └── index.html, assets   # built frontend static files
```

---

## 3. Backend Setup

### Node

- Installed via NodeSource
- Version: **Node 24**
- Managed system-wide (not nvm)

### systemd service

- Service name: `spellbook-api`
- Runs as user: `spellbook`
- Working directory: `/opt/spellbook` (workspace root)
- Backend started via npm workspace:

```ini
ExecStart=/usr/bin/npm run -w server start
```

### Environment config

File:

```
/etc/default/spellbook-api
```

Example:

```
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
DATABASE_URL="file:/opt/spellbook/data/spellbook.db"
```

> **Important**
>
> - Always use an **absolute path** for SQLite `DATABASE_URL`
> - Directory containing the DB must be writable by the service user

---

## 4. Frontend Deployment

### Build

- Built **locally** (not on server, due to memory limits)

### Deploy

- Static build files copied to:

```
/var/www/spellbook
```

- Ownership:

```
www-data:www-data
```

---

## 5. Nginx Configuration

File:

```
/etc/nginx/sites-available/spellbook
```

Key points:

- SPA routing via `try_files … /index.html`
- API proxy without trailing slash:

```nginx
location /api/ {
  proxy_pass http://127.0.0.1:3000;
}
```

This preserves backend routes like:

```
/api/rulebooks
```

---

## 6. Database (SQLite)

- DB file:

```
/opt/spellbook/data/spellbook.db
```

- Owned by:

```
spellbook:spellbook
```

- Directory must be writable (SQLite creates `-wal` / `-shm` files)

---

## 7. Deployment Workflow (Manual)

### Backend update

1. SSH into server
2. Pull repo updates
3. Install backend deps (workspace-only)
4. Build backend
5. Restart service

### Frontend update

1. Build locally
2. SCP build output to server home
3. Copy to `/var/www/spellbook`
4. Reload Nginx

(Automated via `deploy-web.bat`)

---

## 8. Operational Notes

- **systemd is preferred over PM2**
- Nginx is the _only_ service bound to port 80
- Backend is not exposed publicly
- `/health` is internal-only by default
- Lightsail snapshots used for backups
- Instance is disposable; DB is the critical state

---

## 9. Known Limitations (Accepted for v1.1)

- SQLite (single-instance only)
- No HTTPS yet
- No automated CI/CD
- No horizontal scaling

These are acceptable for early user testing and will be revisited later.
