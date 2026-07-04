#!/usr/bin/env bash
set -euo pipefail

SITE_NAME="${SPELLBOOK_NGINX_SITE_NAME:-spellbook}"
SITE_AVAILABLE="/etc/nginx/sites-available/$SITE_NAME"
SITE_ENABLED="/etc/nginx/sites-enabled/$SITE_NAME"
FRONTEND_ROOT="${SPELLBOOK_FRONTEND_ROOT:-/var/www/spellbook}"
API_UPSTREAM="${SPELLBOOK_API_UPSTREAM:-http://127.0.0.1:3000}"

echo "==> Apply Nginx site config: $SITE_NAME"

tmp="$(mktemp)"
cat > "$tmp" <<EOF
server {
  listen 80;
  server_name _;

  root $FRONTEND_ROOT;
  index index.html;

  add_header X-Content-Type-Options nosniff always;
  add_header X-Frame-Options SAMEORIGIN always;
  add_header Referrer-Policy strict-origin-when-cross-origin always;

  location /locales/ {
    add_header Cache-Control "no-cache" always;
    try_files \$uri =404;
  }

  location / {
    try_files \$uri \$uri/ /index.html;
  }

  location /api/ {
    proxy_pass $API_UPSTREAM;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
  }

  location ~* \.(?:js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?)$ {
    expires 7d;
    add_header Cache-Control "public, max-age=604800, immutable" always;
    try_files \$uri =404;
  }
}
EOF

if sudo test -f "$SITE_AVAILABLE"; then
  backup="${SITE_AVAILABLE}.bak.$(date -u +%Y%m%dT%H%M%SZ)"
  echo "==> Backup existing config -> $backup"
  sudo cp -a "$SITE_AVAILABLE" "$backup"
fi

sudo install -m 644 -o root -g root "$tmp" "$SITE_AVAILABLE"
rm -f "$tmp"

if ! sudo test -e "$SITE_ENABLED"; then
  sudo ln -s "$SITE_AVAILABLE" "$SITE_ENABLED"
fi

if sudo test -e /etc/nginx/sites-enabled/default; then
  sudo rm -f /etc/nginx/sites-enabled/default
fi

echo "==> Test Nginx config"
sudo nginx -t

echo "==> Reload Nginx"
sudo systemctl reload nginx

echo "==> Nginx site config applied"
